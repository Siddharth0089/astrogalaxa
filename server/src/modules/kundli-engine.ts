import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import sweph from "sweph";
import { rashis } from "../common/signs.js";
import { AppError } from "../common/http.js";

export const ENGINE_VERSION = "swiss-lahiri-moshier-1";
type Birth = { dob?: Date | null; time?: string | null; lat?: number | null; lng?: number | null; timezone?: string | null; placeName?: string | null };
const stars = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const periods = [{planet:"Ketu", years:7}, {planet:"Venus", years:20}, {planet:"Sun", years:6}, {planet:"Moon", years:10}, {planet:"Mars", years:7}, {planet:"Rahu", years:18}, {planet:"Jupiter", years:16}, {planet:"Saturn", years:19}, {planet:"Mercury", years:17}];
const interpretations: Record<string,string> = { Ketu:"A time for reflection and release.", Venus:"A time to reflect on relationships and creativity.", Sun:"A time to consider purpose and responsibility.", Moon:"A time to attend to feelings and family.", Mars:"A time to direct energy thoughtfully.", Rahu:"A time to consider change and ambition.", Jupiter:"A time for growth, learning and perspective.", Saturn:"A time to cultivate patience and responsibility.", Mercury:"A time for learning and communication." };
const yearMs = 365.2425 * 86400000;
const normalized = (x: number) => ((x % 360) + 360) % 360;
const nakshatra = (longitude: number) => { const division = 360 / 27; const index = Math.floor(normalized(longitude) / division); return { name: stars[index], index, pada: Math.floor((normalized(longitude) % division) / (division / 4)) + 1 }; };

export function calculateDasha(moonLongitude: number, birth: Date, now = new Date(), approximate = false) {
  const position = normalized(moonLongitude) / (360 / 27);
  const initial = Math.floor(position) % 9;
  const elapsedFraction = position - Math.floor(position);
  let start = birth.getTime() - elapsedFraction * periods[initial].years * yearMs;
  const timeline = Array.from({length: 18}, (_, i) => { const period = periods[(initial+i)%9]; const end = start + period.years*yearMs; const result = {planet:period.planet, start:new Date(start).toISOString(), end:new Date(end).toISOString(), startMs:start, endMs:end, years:period.years}; start=end; return result; });
  const nowMs = now.getTime();
  const currentIndex = timeline.findIndex(x=>x.startMs <= nowMs && nowMs < x.endMs);
  const current = currentIndex < 0 ? null : timeline[currentIndex];
  let subperiod: {planet:string; start:string; end:string} | null = null;
  if (current) { const lordIndex=periods.findIndex(x=>x.planet===current.planet); let subStart=current.startMs; for(let i=0;i<9;i++){ const p=periods[(lordIndex+i)%9]; const subEnd=subStart+(current.endMs-current.startMs)*p.years/120; if(nowMs>=subStart&&nowMs<subEnd){subperiod={planet:p.planet,start:new Date(subStart).toISOString(),end:new Date(subEnd).toISOString()};break;} subStart=subEnd; } }
  return { approximate, current: current ? {planet:current.planet,start:current.start,end:current.end,percentElapsed:Math.max(0,Math.min(100,((nowMs-current.startMs)/(current.endMs-current.startMs))*100)),subperiod,interpretation:interpretations[current.planet]} : null, timeline: timeline.map((p,i)=>({planet:p.planet,start:p.start,end:p.end,tag:i===currentIndex?"Now":p.endMs<=nowMs?"Past":i===currentIndex+1||currentIndex<0&&p.startMs>nowMs&&i===0?"Next":"Later"})) };
}

export function computeKundli(userId: string, birth: Birth, now = new Date()) {
  if (!birth.dob || !birth.timezone || birth.lat == null || birth.lng == null) throw new AppError(400,"BIRTH_DETAILS_INVALID","Birth date, place and timezone are required");
  const date = new Date(birth.dob);
  const parts = /^(\d{2}):(\d{2})$/.exec(birth.time ?? "12:00");
  if (!Number.isFinite(date.getTime()) || !parts || Number(parts[1])>23 || Number(parts[2])>59) throw new AppError(400,"BIRTH_DETAILS_INVALID","Birth date or time is invalid");
  const local = DateTime.fromObject({ year:date.getUTCFullYear(), month:date.getUTCMonth()+1, day:date.getUTCDate(), hour:Number(parts[1]), minute:Number(parts[2]) }, {zone:birth.timezone});
  if (!local.isValid || local.hour!==Number(parts[1]) || local.minute!==Number(parts[2])) throw new AppError(400,"BIRTH_TIME_INVALID","This local time does not exist in the selected timezone");
  if (birth.time && local.getPossibleOffsets().length > 1) throw new AppError(400,"BIRTH_TIME_AMBIGUOUS","This birth time occurs twice due to a clock change; contact support to clarify the offset");
  const utc=local.toUTC(); const julian=sweph.julday(utc.year,utc.month,utc.day,utc.hour+utc.minute/60+utc.second/3600,sweph.constants.SE_GREG_CAL);
  sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI,0,0);
  const flags=sweph.constants.SEFLG_MOSEPH|sweph.constants.SEFLG_SIDEREAL|sweph.constants.SEFLG_SPEED;
  const ascResult=birth.time?sweph.houses_ex(julian,sweph.constants.SEFLG_SIDEREAL,birth.lat,birth.lng,"W"):null;
  if (ascResult && ascResult.flag < 0) throw new AppError(422,"ASCENDANT_UNAVAILABLE","Could not calculate the ascendant for this location");
  const ascLongitude=ascResult ? normalized(ascResult.data.points[0]) : null;
  const ascIndex=ascLongitude === null ? null : Math.floor(ascLongitude/30);
  const ids = [["Sun",sweph.constants.SE_SUN],["Moon",sweph.constants.SE_MOON],["Mars",sweph.constants.SE_MARS],["Mercury",sweph.constants.SE_MERCURY],["Jupiter",sweph.constants.SE_JUPITER],["Venus",sweph.constants.SE_VENUS],["Saturn",sweph.constants.SE_SATURN],["Rahu",sweph.constants.SE_MEAN_NODE]] as const;
  const calculated=ids.map(([id,body])=>{const result=sweph.calc_ut(julian,body,flags);if(result.flag<0 || !Number.isFinite(result.data[0]))throw new AppError(503,"EPHEMERIS_UNAVAILABLE","Planetary calculations are unavailable");return {id,longitude:normalized(result.data[0]),retrograde:result.data[3]<0};});
  const node=calculated[calculated.length-1]; calculated.push({id:"Ketu" as typeof node.id,longitude:normalized(node.longitude+180),retrograde:node.retrograde});
  const planets=calculated.map(p=>{const index=Math.floor(p.longitude/30), star=nakshatra(p.longitude);return {id:p.id,sign:rashis[index].name,degree:p.longitude%30,house:ascIndex===null?null:((index-ascIndex+12)%12)+1,nakshatra:star.name,pada:star.pada,retrograde:p.retrograde};});
  const moon=calculated[1];
  const birthHash=createHash("sha256").update(JSON.stringify({dob:date.toISOString(),time:birth.time??null,lat:birth.lat,lng:birth.lng,timezone:birth.timezone})).digest("hex");
  return {userId,birthHash,engineVersion:ENGINE_VERSION,accuracy:birth.time?"full":"approximate",ascendant:ascIndex===null?null:{sign:rashis[ascIndex].name,degree:ascLongitude!%30},planets,moonSign:rashis[Math.floor(moon.longitude/30)].name,nakshatra:nakshatra(moon.longitude),dasha:calculateDasha(moon.longitude,utc.toJSDate(),now,!birth.time),computedAt:now};
}

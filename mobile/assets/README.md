# Astro Galaxa — App Icon & Branding Assets

Place your image assets in this folder. Expo uses these files when generating your standalone APK, iOS build, and splash screens.

## Required Asset Files

| Filename | Resolution | Description & Best Practice |
|---|---|---|
| `icon.png` | **1024 × 1024 px** | Square PNG (no transparency for iOS). Main launcher icon. |
| `adaptive-icon.png` | **1024 × 1024 px** | Transparent background PNG. Keep the logo artwork within the center **66% circle** (safe zone: ~676 × 676 px) so Android squircle/round masking doesn't crop it. |
| `splash-icon.png` | **1024 × 1024 px** | Centered logo on transparent background. Displayed during app launch against `#000000` background. |
| `favicon.png` | **48 × 48 px** (or 192 × 192 px) | Web browser tab icon. |
| `logo.png` *(Optional)* | **Any size** (e.g. 512 × 512 px) | In-app logo if you want to replace the default SVG moon on the Login screen. |

## Quick Tool to Generate All Sizes
If you only have one high-resolution logo image (e.g., 1024 × 1024 px PNG):
1. Use an online tool like [appicon.co](https://appicon.co/) or [easyappicon.com](https://easyappicon.com/).
2. Or generate them with Figma/Canva/Photoshop.
3. Save the exported files with the exact names listed above into this `mobile/assets/` folder.

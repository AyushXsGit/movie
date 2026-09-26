# MovieHub

## External player support

The website keeps the existing movie/series quality selection and browser player.
After a stream URL is returned, it adds buttons for VLC, MX Player, Next Player, and Copy stream URL.

### Android
- VLC: sends the selected network URL to the VLC Android package.
- MX Player: sends the selected network URL to the MX Player Android package.
- Next Player: sends the selected network URL to the Next Player Android package.
- If the requested app is not installed, Android can fall back to the normal network URL/app handling.

Android supports routing URLs to installed apps through intents. VLC for Android supports network streams including DASH, and Next Player supports URL playback including DASH/HLS/RTSP.

### iPhone/iPad
- VLC: uses the VLC iOS callback URL as a best-effort app handoff. iOS/Safari may ask the user to allow opening VLC.
- MX Player and Next Player: there is no universal browser mechanism that can force an Android-only player to launch on iPhone/iPad. The site therefore provides Copy stream URL instead of pretending the launch worked.

### Windows/macOS/Linux
A normal browser is not allowed to execute an installed desktop application directly. For VLC on Windows, run `install-vlc-protocol.bat` once. It registers the `moviehub-vlc://` protocol and passes the real network URL to VLC, rather than opening/downloading the `.mpd` URL in the browser.

### Important
The external-player buttons use the currently selected stream URL. They do not intentionally download the DASH manifest.

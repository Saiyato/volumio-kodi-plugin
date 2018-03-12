# volumio-kodi-plugin
Installation script for Kodi on Volumio 2.x images (Raspberry Pi only)

## Lazy installation of unsanctioned versions (quick version)
1. SSH into server
2. Execute the below command:
```
sudo wget -O volumio_install_from_zip.sh https://raw.githubusercontent.com/Saiyato/volumio-plugin-helper/master/volumio_install_from_zip.sh
```
This will download the installation script.
3. Execute the script (DO NOT USE sudo!) you've just downloaded using the below command:
```
sh volumio_install_from_zip.sh Saiyato volumio-kodi-plugin
```
You can use this install script for any plugin (if they are hosted separately), just add $1 = author and $2 = repository.

### Lazy installation by downloading the whole git repo (takes longer to download)
1. SSH into server
2. Execute the below command:
```
sudo wget -O volumio_installer.sh https://raw.githubusercontent.com/Saiyato/volumio-kodi-plugin/master/volumio_installer.sh
```
This will download the installation script.
3. Execute the script (DO NOT USE sudo!) you've just downloaded using the below command:
```
sh volumio_installer.sh
```

The zip-file contains all the scripts you need to install Kodi on top of any Volumio 2.x image. A settings page has been added to allow for easy configuration of the config.txt settings for Kodi and some specific sound settings in case you want to use your DAC for sound output.

If you enable the plugin in the plugins section in Volumio it will automatically start, you might want to reboot first after installation.
![Alt text](/images/plugin_enabled.png?raw=true "Plugin enabled")

The system settings section allows you to change the amount of memory reserved for the gpu and whether the HDMI port should be considered hotplug.
![Alt text](/images/system_settings.png?raw=true "System settings")

The sound settings section allows you to override ALSA's default soundcard, thus enabling you to use your DAC in Kodi. Also, if you are using a Kali reclocker, you might want to configure the delay (of 0.7 seconds).
![Alt text](/images/sound_settings.png?raw=true "Sound settings")

The Kodi optimalisation sections allows you to edit some Kodi sound configuration (requires a restart of Kodi) settings.
![Alt text](/images/kodi_optimalisation.png?raw=true "Kodi sound settings")

Supported devices:
- Raspberry Pi A/B/A+/B+/2B/3B/Zero

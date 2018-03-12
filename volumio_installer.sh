# Volumio installer (workaround for fixes not in the Volumio repo)
if [ ! -d /home/volumio/volumio-kodi-plugin ];
then
	mkdir /home/volumio/volumio-kodi-plugin
else
	rm -rf home/volumio/volumio-kodi-plugin
	mkdir /home/volumio/volumio-kodi-plugin
fi

echo "Cloning github repo... (this might take a while)"
git clone https://github.com/Saiyato/volumio-kodi-plugin /home/volumio/volumio-kodi-plugin

echo "Cleaning up the directory..."
cd /home/volumio/volumio-kodi-plugin
rm -rf .git
rm -rf images
rm -rf kodi_configuration
rm -rf policies
rm -rf unit
rm .gitattributes
rm README.md
rm volumio_installer.sh
rm volumio-kodi-plugin.zip

echo "Installing plugin..."
volumio plugin install
echo "Done!"
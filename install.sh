#!/bin/bash
echo "Installing Kodi and its dependencies..."
INSTALLING="/home/volumio/kodi-plugin.installing"

if [ ! -f $INSTALLING ]; then

	touch $INSTALLING
	echo "Detecting architecture"
	dist=$(lsb_release -c | grep Codename | awk '{print $2}')
	arch=$(lscpu | awk 'FNR == 1 {print $2}')
	
	# See table here: https://www.raspberrypi-spy.co.uk/2012/09/checking-your-raspberry-pi-board-version/
	rev=$(cat /proc/cpuinfo | grep 'Revision' | awk '{print $3}')
	
	echo "Detected device information:\nOS Distribution\t= ${dist}\nCPU Architecture\t= ${arch}\nBoard Revision\t= ${rev}"

	# Continue installation
	if [ $? -eq 0 ]
	then

		# armv6l
		if [ $arch = "armv6l" ]; then
			echo "Installation is not recommended, performance may be disappointing. Continuing nonetheless... Be sure to grab some coffee, do laundry or... (This might take a while)"
		
		# armv7l && Jessie
		elif [ $arch = "armv7l" ] && [ ! $rev = "a03111" ] && [ ! $rev = "b03111" ] && [ ! $rev = "c03111" ] && [ $dist = "jessie" ]; then
			echo "Continuing installation, this may take a while, you can grab a cup of coffee (or more)"
		
		# armv7l && Buster
		elif [ $arch = "armv7l" ] && [ $dist = "buster" ]; then
			echo "Continuing installation, this may take a while, you can grab a cup of coffee (or more)"
		
		# unsupported device (afaik)
		else
			echo "Sorry, your device is not (yet) supported! This especially applies to Raspberry Pi 4's, since they require Debian Buster to function."
			echo "Exiting now..."
			rm $INSTALLING
			echo "plugininstallend"
			exit
		fi
		
		# Only add the repo if it doesn't already exist -> pipplware = Krypton 17.4 (at time of writing: 25-12-2019) and Leia 18.5 (for Buster only!)
		if ! grep -q "pipplware" /etc/apt/sources.list /etc/apt/sources.list.d/*.list;
		then
			echo "deb http://pipplware.pplware.pt/pipplware/dists/${dist}/main/binary /" | sudo tee -a /etc/apt/sources.list.d/pipplware.list
			wget -O - http://pipplware.pplware.pt/pipplware/key.asc | sudo apt-key add -
		fi
		
		# Update repositories // the echo before a while-loop in if/elif/else-conditions is needed!
		echo "Updating package lists..."
		while fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
			echo "Waiting for other software managers to finish..." 
			sleep 2
		done
		apt-get update
		
		# Install Kodi and debugger
		if [ -f "/usr/bin/kodi" ]
		then
			echo "Kodi binaries found, not installing!"
		else
			echo "Getting Kodi binaries..."
			while fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
			echo "Waiting for other software managers to finish..."
				sleep 2
			done
			apt-get -y install gdb fbset kodi
			# apt-get -y install gdb fbset kodi openvpn sysvinit psmisc 
			# ln -fs /usr/sbin/openvpn /usr/bin/openvpn
		fi
		
		# Prepare usergroups and configure user
		echo "Preparing the Kodi user and groups"
		addgroup --system input
		#adduser kodi
		useradd --create-home kodi
		usermod -aG audio,video,input,dialout,plugdev,tty kodi
		usermod -aG kodi volumio
		
		# Link to /data/configuration/miscellanea/Kodi/Configuration
		mkdir /data/configuration/miscellanea/kodi
		mkdir /data/configuration/miscellanea/kodi/Configuration
		mkdir /data/configuration/miscellanea/kodi/Configuration/userdata
		chown volumio:volumio -R /data/configuration/miscellanea/kodi
		
		ln -fs /data/configuration/miscellanea/kodi/Configuration /home/kodi/.kodi
		chown kodi:kodi -R /data/configuration/miscellanea/kodi/Configuration
		chown kodi:kodi -R /home/kodi
		
		# Add input rules
		echo "Adding input rules"
		cp -f /data/plugins/miscellanea/kodi/policies/99-input.rules /etc/udev/rules.d/99-input.rules

		# Add input permissions
		echo "Adding input permissions"
		cp -f /data/plugins/miscellanea/kodi/policies/10-permissions.rules /etc/udev/rules.d/10-permissions.rules

		# Map the EGL libraries
		rm /etc/ld.so.conf.d/00-vmcs.conf
		echo "/opt/vc/lib/" | sudo tee /etc/ld.so.conf.d/00-vmcs.conf
		ldconfig

		# Update the boot config; use userconfig for forward compatibility
		#CONFIG="/boot/userconfig.txt"
		#if [ ! -f $CONFIG ]; then
		#	touch $CONFIG
		#	# Insert empty line at the end of the file, otherwise the following sed commands will fail
		#	sed -i -e '$a\' $CONFIG
		#fi
		#sed '/^include userconfig.txt/{h;s/=.*/NOT THERE/};${x;/^$/{s//include userconfig.txt/;H};x}' -i /boot/config.txt
		
		CONFIG="/boot/config.txt"
		echo "Updating GPU memory to 256MB/144MB/112MB/32MB..."
		sed '/^gpu_mem=/{h;s/=.*/=32/};${x;/^$/{s//gpu_mem=32/;H};x}' -i $CONFIG
		sed '/^gpu_mem_1024=/{h;s/=.*/=256/};${x;/^$/{s//gpu_mem_1024=256/;H};x}' -i $CONFIG
		sed '/^gpu_mem_512=/{h;s/=.*/=144/};${x;/^$/{s//gpu_mem_512=144/;H};x}' -i $CONFIG
		sed '/^gpu_mem_256=/{h;s/=.*/=112/};${x;/^$/{s//gpu_mem_256=112/;H};x}' -i $CONFIG		
		
		echo "Setting HDMI to hotplug..."
		sed '/^hdmi_force_hotplug=/{h;s/=.*/=1/};${x;/^$/{s//hdmi_force_hotplug=1/;H};x}' -i $CONFIG
		
		# Create the ALSA override file
		echo "Creating ALSA override"
		touch /etc/asound.conf
		cat "
#KODI
	defaults.ctl.card ${CTL_CARD_INDEX}
	defaults.pcm.card ${PCM_CARD_INDEX}
#ENDOFKODI" >> /etc/asound.conf
		chown volumio:volumio /etc/asound.conf
		
		# Add the systemd unit
		cp -f /data/plugins/miscellanea/kodi/unit/kodi.service /etc/systemd/system/kodi.service
		echo "Added the systemd unit"

		cp -f /data/plugins/miscellanea/kodi/policies/50-kodi-actions.pkla /etc/polkit-1/localauthority/50-local.d/50-kodi-actions.pkla
		echo "Added policykit actions for kodi (access usb drives, reboot)"
		
		# Let's throw in some repo URLs
		echo "Adding file links to easily install repos, use at your own discretion, I do not own any of these! Nor can I be held responsible in any way, the information is readily available on the internet."
		wget -O /home/kodi/.kodi/userdata/guisettings.xml https://raw.githubusercontent.com/Saiyato/volumio-kodi-plugin/master/kodi_configuration/guisettings.xml
		wget -O /home/kodi/.kodi/userdata/sources.xml https://raw.githubusercontent.com/Saiyato/volumio-kodi-plugin/master/kodi_configuration/sources.xml
		
		chown kodi:kodi /home/kodi/.kodi/userdata/guisettings.xml
		chmod 664 /home/kodi/.kodi/userdata/guisettings.xml
		chown kodi:kodi /home/kodi/.kodi/userdata/sources.xml
		
		# disable the pipplware archive/ppa (don't delete it if you wanna update manually)
		sed '/pipplware/d' -i /etc/apt/sources.list
		mv /etc/apt/sources.list.d/pipplware.list /etc/apt/sources.list.d/pipplware.disabled
		# apt-key del BAA567BB
		apt-get autoclean
		
		rm $INSTALLING
		
	else
		echo "Could not add repository, cancelling installation."
	fi	

	#required to end the plugin install
	echo "plugininstallend"
else
	echo "Plugin is already installing! Not continuing..."
fi

# Do nothing, because ending plugin installation breaks the initial one

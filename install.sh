#!/bin/bash
echo "Installing Kodi and its dependencies..."
INSTALLING="/home/volumio/kodi-plugin.installing"

if [ ! -f $INSTALLING ]; then

	touch $INSTALLING
	echo "Detecting architecture"
	dist=$(lsb_release -c | grep Codename | awk '{print $2}')
	arch=$(lscpu | awk 'FNR == 1 {print $2}')
	defaultPPA=0 
	
	# See table here: https://www.raspberrypi-spy.co.uk/2012/09/checking-your-raspberry-pi-board-version/
	rev=$(cat /proc/cpuinfo | grep 'Revision' | awk '{print $3}')
	
	echo "Detected device information:\nOS Distribution\t= ${dist}\nCPU Architecture\t= ${arch}\nBoard Revision\t= ${rev}"

	# Continue installation
	if [ $? -eq 0 ]
	then

		# armv6l
		if [ $arch = "armv6l" ]; then
			echo "Installation is not recommended, performance may be disappointing. Continuing nonetheless... Be sure to grab some coffee, do laundry or... (This might take a while)"
		
		# armv7l && !rPi4 && Jessie distro
		elif [ $arch = "armv7l" ] && [ ! $rev = "a03111" ] && [ ! $rev = "b03111" ] && [ ! $rev = "c03111" ] && [ $dist = "jessie" ]; then
			echo "Continuing installation, this may take a while, you can grab a cup of coffee (or more)"
		
		# Buster distro
		elif [ $dist = "buster" ] || [ $arch = "i686" ]; then
			echo "Installing from the default ppa, sit back and relax... this might take a few minutes"
			defaultPPA=1
		
		# unsupported device (afaik)
		else
			echo "Sorry, your device is not (yet) supported! This especially applies to Raspberry Pi 4's, since they require Debian Buster to function."
			echo "Exiting now..."
			rm $INSTALLING
			echo "plugininstallend"
			exit
		fi
		
		# Only add the repo if it doesn't already exist && distro is Jessie -> pipplware = Krypton 17.4 (at time of writing: 25-12-2019)
		if [ -f "/etc/apt/sources.list.d/pipplware.list" ] && [ $defaultPPA = 0 ];
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
		mkdir /data/configuration/miscellanea/kodi/kodi_config
		mkdir /data/configuration/miscellanea/kodi/kodi_config/userdata
		
		ln -fs /data/configuration/miscellanea/kodi/kodi_config /home/kodi/.kodi
		chown kodi:kodi -R /data/configuration/miscellanea/kodi/kodi_config
		chmod -R 775 /data/configuration/miscellanea/kodi/kodi_config
		
		# Add input rules
		echo "Adding input rules"
		cp -f /data/plugins/miscellanea/kodi/policies/99-input.rules /etc/udev/rules.d/99-input.rules

		# Add input permissions
		echo "Adding input permissions"
		cp -f /data/plugins/miscellanea/kodi/policies/10-permissions.rules /etc/udev/rules.d/10-permissions.rules

		# Map the EGL libraries
		echo "/opt/vc/lib/" | sudo tee /etc/ld.so.conf.d/00-vmcs.conf
		ln -fs /opt/vc/bin/tvservice /usr/bin/tvservice
		ldconfig		
		
		# Memory must be set in /boot/config.txt, because included files will not be interpreted at boot time
		CONFIG="/boot/config.txt"
		echo "Updating GPU memory to 256MB/144MB/112MB/32MB..."
		sed '/^gpu_mem=/{h;s/=.*/=32/};${x;/^$/{s//gpu_mem=32/;H};x}' -i $CONFIG
		sed '/^gpu_mem_1024=/{h;s/=.*/=320/};${x;/^$/{s//gpu_mem_1024=320/;H};x}' -i $CONFIG
		sed '/^gpu_mem_512=/{h;s/=.*/=144/};${x;/^$/{s//gpu_mem_512=144/;H};x}' -i $CONFIG
		sed '/^gpu_mem_256=/{h;s/=.*/=112/};${x;/^$/{s//gpu_mem_256=112/;H};x}' -i $CONFIG		
		
		# include userconfig.txt in config.txt
		sed '/^include userconfig.txt/{h;s/=.*/NOT THERE/};${x;/^$/{s//include userconfig.txt/;H};x}' -i $CONFIG
		
		# Update the boot config; use userconfig for forward compatibility
		USERCONFIG="/boot/userconfig.txt"
		if [ ! -f $USERCONFIG ]; then
			touch $USERCONFIG
			# Insert empty line at the end of the file, otherwise the following sed commands will fail
			sed -i -e '$a\' $USERCONFIG
		fi
		
		# Update 3D driver for Pi4
		if [ $arch = "armv7l" ] && [ $rev = "a03111" ] && [ $rev = "b03111" ] && [ $rev = "c03111" ]; then
			sed '/^dtoverlay=vc4-fkms-v3d/{h;s/dtoverlay=vc4-fkms-v3d.*/dtoverlay=vc4-fkms-v3d/};${x;/^$/{s//dtoverlay=vc4-fkms-v3d/;H};x}' -i $USERCONFIG
		fi
		
		echo "Setting HDMI to hotplug..."
		sed '/^hdmi_force_hotplug=/{h;s/=.*/=1/};${x;/^$/{s//hdmi_force_hotplug=1/;H};x}' -i $USERCONFIG
		
		# Create an empty ALSA override file
		echo "Creating ALSA override"
		touch /etc/asound.conf
		cat "
#KODI
#ENDOFKODI" >> /etc/asound.conf
		chown volumio:volumio /etc/asound.conf
		
		# Add the systemd unit
		cp -f /data/plugins/miscellanea/kodi/unit/kodi.service /etc/systemd/system/kodi.service
		echo "Added the systemd unit"

		cp -f /data/plugins/miscellanea/kodi/policies/50-kodi-actions.pkla /etc/polkit-1/localauthority/50-local.d/50-kodi-actions.pkla
		echo "Added policykit actions for kodi (access usb drives, reboot)"
				
		# Disable the pipplware archive/PPA (don't delete it if you want to update manually from the Pipplware PPA)
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

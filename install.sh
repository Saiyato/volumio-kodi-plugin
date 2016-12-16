#!/bin/bash
echo "Installing Kodi and its dependencies..."

echo "Detecting cpu"
cpu=$(lscpu | awk 'FNR == 1 {print $2}')

echo "deb http://archive.mene.za.net/raspbian jessie contrib" | sudo tee -a /etc/apt/sources.list
apt-key adv --keyserver keyserver.ubuntu.com --recv-key 5243CDED
if [ $? -eq 0 ]
then
	
	# Update repositories
	echo "Updating package lists..."
	apt-get update

	# armv6l
	if [ $cpu = "armv6l" ]
	then
		echo "Installation is not recommended, performance may be disappointing. Continuing nonetheless... Be sure to grab some coffee, do laundry or... (This might take a while)"
	
	# armv7l
	elif [ $cpu = "armv7l" ]
	then
		echo "Continuing installation, this may take a while, you can grab a cup of coffee (or more)"		
	
	# unsupported device (afaik)
	else
		echo "Sorry, your device is not (yet) supported!"
		echo "Exiting now..."
		exit -1
	fi
	
	# Install Kodi and debugger
	apt-get -y install gdb kodi
	
	# Prepare usergroups and configure user
	echo "Preparing the Kodi user and groups"
	addgroup --system input
	#adduser kodi
	usermod -aG audio,video,input,dialout,plugdev,tty kodi

	# Enable auto-login
	echo "Enabling auto-login for user volumio"
	INITTAB="/etc/inittab"
	if grep -q "1:2345:respawn:/sbin/getty 38400 tty1" $INITTAB; 
	then
	   sed -i -- 's#1:2345:respawn:/sbin/getty 38400 tty1#1:2345:respawn:/sbin/getty --autologin volumio --noclear 38400 tty1#g' $INITTAB
	fi

	# Configure Kodi auto-launch
	echo "Enabling auto-launch for Kodi"
	KODICONFIG="/etc/default/kodi"
	if grep -q "ENABLED=0" $KODICONFIG; 
	then
		sed -i -- 's/ENABLED=0/ENABLED=1/g' $KODICONFIG
	fi

	# Add input rules
	echo "Adding input rules"
	echo "SUBSYSTEM==\"input\", GROUP=\"input\", MODE=\"0660\"
	KERNEL==\"tty[0-9]*\", GROUP=\"tty\", MODE=\"0660\"" | sudo tee -a /etc/udev/rules.d/99-input.rules

	# Add input permissions
	echo "Adding input permissions"
	echo "# input
	KERNEL==\"mouse*|mice|event*\",   MODE=\"0660\", GROUP=\"input\"
	KERNEL==\"ts[0-9]*|uinput\",     MODE=\"0660\", GROUP=\"input\"
	KERNEL==\"js[0-9]*\",             MODE=\"0660\", GROUP=\"input\"
	# tty
	KERNEL==\"tty[0-9]*\",            MODE=\"0666\"
	# vchiq
	SUBSYSTEM==\"vchiq\",  GROUP=\"video\", MODE=\"0660\"" | sudo tee -a /etc/udev/rules.d/10-permissions.rules

	# Map the EGL libraries
	echo "/opt/vc/lib/" | sudo tee /etc/ld.so.conf.d/00-vmcs.conf
	ldconfig

	# Update the gpu_mem parameter
	echo "Updating GPU memory to 248MB"
	CONFIG="/boot/config.txt"
	if grep -q gpu_mem=16 $CONFIG; 
	then
	   sed -i -- 's/gpu_mem=16/gpu_mem=248/g' $CONFIG
	else
		sed -i -- 's/gpu_mem=/#gpu_mem=/g' $CONFIG
		echo "gpu_mem=248" | sudo tee -a $CONFIG
	fi

	echo "Setting HDMI to hotplug..."
	echo "hdmi_force_hotplug=1" | sudo tee -a /boot/config.txt
	
else
	echo "Could not add repository, cancelling installation."
	exit -1
fi	

#required to end the plugin install
echo "plugininstallend"

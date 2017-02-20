#!/bin/bash
echo "Installing Kodi and its dependencies..."

echo "Detecting cpu"
cpu=$(lscpu | awk 'FNR == 1 {print $2}')

# Only add the repo if it doesn't already exist
if ! grep -q "mene.za.net" /etc/apt/sources.list /etc/apt/sources.list.d/*; 
then
	echo "deb http://archive.mene.za.net/raspbian jessie contrib" | sudo tee -a /etc/apt/sources.list
	apt-key adv --keyserver keyserver.ubuntu.com --recv-key 5243CDED
fi

# Continue installation
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

	# Add input rules
	echo "Adding input rules"
	rm /etc/udev/rules.d/99-input.rules
	echo "
	SUBSYSTEM==\"input\", GROUP=\"input\", MODE=\"0660\"
	KERNEL==\"tty[0-9]*\", GROUP=\"tty\", MODE=\"0660\"" | sudo tee -a /etc/udev/rules.d/99-input.rules

	# Add input permissions
	echo "Adding input permissions"
	rm /etc/udev/rules.d/10-permissions.rules
	echo "
	# input
	KERNEL==\"mouse*|mice|event*\",   MODE=\"0660\", GROUP=\"input\"
	KERNEL==\"ts[0-9]*|uinput\",     MODE=\"0660\", GROUP=\"input\"
	KERNEL==\"js[0-9]*\",             MODE=\"0660\", GROUP=\"input\"
	# tty
	KERNEL==\"tty[0-9]*\",            MODE=\"0666\"
	# vchiq
	SUBSYSTEM==\"vchiq\",  GROUP=\"video\", MODE=\"0660\"" | sudo tee -a /etc/udev/rules.d/10-permissions.rules

	# Map the EGL libraries
	rm /etc/ld.so.conf.d/00-vmcs.conf
	echo "/opt/vc/lib/" | sudo tee /etc/ld.so.conf.d/00-vmcs.conf
	ldconfig

	# Update the boot config
	CONFIG="/boot/config.txt"
	
	echo "Updating GPU memory to 248MB..."	
	sed -i -- 's|.*gpu_mem.*|gpu_mem=248|g' $CONFIG
	
	echo "Setting HDMI to hotplug..."
	if ! grep -q "hdmi_force_hotplug" $CONFIG; 
	then
		echo "hdmi_force_hotplug=1" | sudo tee -a $CONFIG 
	else
		sed -i -- 's|.*hdmi_force_hotplug.*|hdmi_force_hotplug=1|g' $CONFIG
	fi	
	
	# Create the ALSA override file
	echo "Creating ALSA override"
	rm /etc/asound.conf
	echo "
	defaults.ctl.card 0
	defaults.pcm.card 0" | sudo tee -a /etc/asound.conf
	
	# Let's throw in some repo URLs
	echo "Adding file links to easily install repos, use at your own discretion, I do not own any of these! Nor can I be held responsible in any way, the information is readily available on the internet."
	rm /home/kodi/.kodi/userdata/sources.xml
	echo "
<sources>
    <programs>
        <default pathversion=\"1\"></default>
    </programs>
    <video>
        <default pathversion=\"1\"></default>
    </video>
    <music>
        <default pathversion=\"1\"></default>
    </music>
    <pictures>
        <default pathversion=\"1\"></default>
    </pictures>
    <files>
        <default pathversion=\"1\"></default>
		<source>
            <name>Filmkodi Repo</name>
            <path pathversion=\"1\">http://kodi.filmkodi.com</path>
            <allowsharing>true</allowsharing>
        </source>
        <source>
            <name>SuperRepo</name>
            <path pathversion=\"1\">http://srp.nu/</path>
            <allowsharing>true</allowsharing>
        </source>
		<source>
            <name>Muckys</name>
            <path pathversion=\"1\">http://muckys.mediaportal4kodi.ml/</path>
            <allowsharing>true</allowsharing>
        </source>
		<source>
            <name>Fusion</name>
            <path pathversion=\"1\">http://fusion.tvaddons.ag/</path>
            <allowsharing>true</allowsharing>
        </source>
		<source>
            <name>Merlin</name>
            <path pathversion=\"1\">http://mwiz.co.uk/repo</path>
            <allowsharing>true</allowsharing>
        </source>
		<source>
            <name>UFO Repo</name>
            <path pathversion=\"1\">http://theuforepo.us/repo/</path>
            <allowsharing>true</allowsharing>
        </source>
		<source>
            <name>Origin Repo</name>
            <path pathversion=\"1\">http://originent.net16.net/originrepo</path>
            <allowsharing>true</allowsharing>
        </source>
    </files>
</sources>" | sudo tee -a /home/kodi/.kodi/userdata/sources.xml
	
	# Add the systemd unit
	rm /etc/systemd/system/kodi.service	
	echo "
	[Unit]
	Description = Kodi Media Center

	# if you don't need the MySQL DB backend, this should be sufficient
	After = systemd-user-sessions.service network.target sound.target

	# if you need the MySQL DB backend, use this block instead of the previous
	#After = systemd-user-sessions.service network.target sound.target mysql.service
	#Wants = mysql.service

	[Service]
	User = kodi
	#Group = root
	Type = simple
	#PAMName = login # you might want to try this one, did not work on all systems
	ExecStart = /usr/bin/kodi-standalone -- :0 -nolisten tcp vt7
	Restart = on-abort
	RestartSec = 5

	[Install]
	WantedBy = multi-user.target" | sudo tee -a /etc/systemd/system/kodi.service
	echo "Added the systemd unit"
	
else
	echo "Could not add repository, cancelling installation."
	exit -1
fi	

#required to end the plugin install
echo "plugininstallend"

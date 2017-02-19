#!/bin/bash
echo "Uninstalling Kodi configs"

rm /etc/udev/rules.d/99-input.rules
rm /etc/udev/rules.d/10-permissions.rules
rm /etc/ld.so.conf.d/00-vmcs.conf
ldconfig

# Update the GPU memory
CONFIG="/boot/config.txt"
echo "Updating GPU memory back to 16MB..."
sed -i -- 's|.*gpu_mem.*|gpu_mem=16|g' $CONFIG

# Remove the systemd unit
rm /etc/systemd/system/kodi.service
systemctl daemon-reload

apt-get purge --auto-remove gdb kodi --yes

# The end...
echo "pluginuninstallend"
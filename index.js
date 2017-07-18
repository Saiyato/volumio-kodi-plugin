'use strict';

var libQ = require('kew');
var libNet = require('net');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;


// Define the ControllerKodi class
module.exports = ControllerKodi;

function ControllerKodi(context) 
{
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}

ControllerKodi.prototype.onVolumioStart = function()
{
	var self = this;
	self.logger.info("Kodi initiated");
	
	this.configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
	self.getConf(this.configFile);
	
	// For debugging purposes
	//self.logger.info('GPU memory: ' + self.config.get('gpu_mem'));
	//self.logger.info("Config file: " + this.configFile);
	
	return libQ.resolve();	
}

ControllerKodi.prototype.getConfigurationFiles = function()
{
	return ['config.json'];
};

// Plugin methods -----------------------------------------------------------------------------
ControllerKodi.prototype.onStop = function() {
	var self = this;

	var defer=libQ.defer();

	exec("/usr/bin/sudo /bin/systemctl stop kodi.service", {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while stopping KODI: ' + error);
			defer.reject();
		}
		else {
			self.commandRouter.pushConsoleMessage('KODI killed');
			defer.resolve();
		}
	});

	return defer.promise;
};

ControllerKodi.prototype.onStart = function() {
	var self = this;
	var defer=libQ.defer();

	exec("/usr/bin/sudo /bin/systemctl start kodi.service", {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while starting KODI: ' + error);
			defer.reject();
		}
		else {
			self.commandRouter.pushConsoleMessage('KODI started');
			defer.resolve();
		}
	});

	return defer.promise;
};

ControllerKodi.prototype.stop = function() 
{
	// Kill process?
	self.logger.info("performing stop action");	
	
	return libQ.resolve();
};


ControllerKodi.prototype.onRestart = function() 
{
	// Do nothing
	self.logger.info("performing onRestart action");	
	
	var self = this;
};

ControllerKodi.prototype.onInstall = function() 
{
	var self = this;
	var responseData = {
	title: 'Restart required [no translation available]',
	message: 'Changes have been made to the boot configuration a restart is required. [no translation available]',
	size: 'lg',
	buttons: [{
			name: self.commandRouter.getI18nString('COMMON.RESTART'),
			class: 'btn btn-info',
			emit: 'reboot',
			payload: ''
			}, {
				name: self.commandRouter.getI18nString('COMMON.CONTINUE'),
				class: 'btn btn-info',
				emit: '',
				payload: ''
			}
		]
	}

	self.commandRouter.broadcastMessage("openModal", responseData);
};

ControllerKodi.prototype.onUninstall = function() 
{
	// Uninstall.sh?
};

ControllerKodi.prototype.getUIConfig = function() {
    var self = this;
	var defer = libQ.defer();    
    var lang_code = this.commandRouter.sharedVars.get('language_code');

	self.getConf(this.configFile);
	self.logger.info("Reloaded the config file");
	
    self.commandRouter.i18nJson(__dirname+'/i18n/strings_' + lang_code + '.json',
    __dirname + '/i18n/strings_en.json',
    __dirname + '/UIConfig.json')
    .then(function(uiconf)
    {
        uiconf.sections[0].content[0].value = self.config.get('gpu_mem_1024');
		uiconf.sections[0].content[1].value = self.config.get('gpu_mem_512');
		uiconf.sections[0].content[2].value = self.config.get('gpu_mem_256');
        uiconf.sections[0].content[3].value = self.config.get('hdmihotplug');
		
		uiconf.sections[1].content[0].value = self.config.get('usedac');
		uiconf.sections[1].content[1].value = self.config.get('kalidelay');
		
		uiconf.sections[2].content[0].value = self.config.get('kodi_gui_sounds');
		uiconf.sections[2].content[1].value = self.config.get('kodi_audio_keepalive');
		uiconf.sections[2].content[2].value = self.config.get('kodi_enable_webserver');
		uiconf.sections[2].content[3].value = self.config.get('kodi_webserver_port');
		uiconf.sections[2].content[4].value = self.config.get('kodi_webserver_username');
		uiconf.sections[2].content[5].value = self.config.get('kodi_webserver_password');
        defer.resolve(uiconf);
    })
    .fail(function()
    {
        defer.reject(new Error());
    });

    return defer.promise;
};

ControllerKodi.prototype.setUIConfig = function(data) {
	var self = this;
	
	self.logger.info("Updating UI config");
	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');
	
	return libQ.resolve();
};

ControllerKodi.prototype.getConf = function(configFile) {
	var self = this;
	this.config = new (require('v-conf'))()
	this.config.loadFile(configFile)
	
	return libQ.resolve();
};

ControllerKodi.prototype.setConf = function(conf) {
	var self = this;
	return libQ.resolve();
};

// Public Methods ---------------------------------------------------------------------------------------

ControllerKodi.prototype.restartKodi = function ()
{
	var self = this;
	var defer=libQ.defer();

	exec("/bin/systemctl restart kodi", {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while starting KODI: ' + error);
			self.commandRouter.pushToastMessage('error', "Restart failed", "Restarting Kodi failed with error: " + error);
			defer.reject();
		}
		else {
			self.commandRouter.pushConsoleMessage('KODI started');
			self.commandRouter.pushToastMessage('success', "Restarted Kodi", "Restarted Kodi for the changes to take effect.");
			defer.resolve();
		}
	});

	return defer.promise;
}

ControllerKodi.prototype.updateBootConfig = function (data) 
{
	var self = this;	
	var defer = libQ.defer();
	var configUpdated = false;
	
	if(self.config.get('gpu_mem_1024') != data['gpu_mem_1024'])
	{
		self.config.set('gpu_mem_1024', data['gpu_mem_1024']);
		configUpdated = true;
	}

	if(self.config.get('gpu_mem_512') != data['gpu_mem_512'])
	{
		self.config.set('gpu_mem_512', data['gpu_mem_512']);
		configUpdated = true;
	}
	
	if(self.config.get('gpu_mem_256') != data['gpu_mem_256'])
	{
		self.config.set('gpu_mem_256', data['gpu_mem_256']);
		configUpdated = true;
	}
	
	if(self.config.get('hdmihotplug') != data['hdmihotplug'])
	{
		self.config.set('hdmihotplug', data['hdmihotplug']);
		configUpdated = true;
	}
	
	if(configUpdated)
	{
		self.writeBootConfig(self.config)
		.fail(function(e)
		{
			defer.reject(new error());
		})
		
		self.logger.info("Successfully updated boot configuration");
		
		var responseData = {
			title: 'Restart required [no translation available]',
			message: 'Changes have been made to the boot configuration a restart is required. [no translation available]',
			size: 'lg',
			buttons: [{
					name: self.commandRouter.getI18nString('COMMON.RESTART'),
					class: 'btn btn-info',
					emit: 'reboot',
					payload: ''
				}, {
					name: self.commandRouter.getI18nString('COMMON.CONTINUE'),
					class: 'btn btn-info',
					emit: '',
					payload: ''
				}
			]
		}

		self.commandRouter.broadcastMessage("openModal", responseData);
	}
	else
	{
		self.commandRouter.pushToastMessage('success', "No change", "No changes detected, will not save.");
	}

	return defer.promise;
}

ControllerKodi.prototype.updateSoundConfig = function (data)
{
	var self = this;
	var defer = libQ.defer();
	
	self.config.set('usedac', data['usedac']);
	self.config.set('kalidelay', data['kalidelay']);
	self.logger.info("Successfully updated sound configuration");
	
	self.writeSoundConfig(data)
	.then(function (restartService) {
		self.restartKodi();
	})
	.fail(function(e)
	{
		defer.reject(new error());
	})
	
	return defer.promise;
}

ControllerKodi.prototype.optimiseKodi = function (data)
{
	var self = this;
	var defer = libQ.defer();
	
	self.config.set('kodi_gui_sounds', data['kodi_gui_sounds']);
	self.config.set('kodi_audio_keepalive', data['kodi_audio_keepalive']);
	self.config.set('kodi_enable_webserver', data['kodi_enable_webserver']);
	self.config.set('kodi_webserver_port', data['kodi_webserver_port']);
	self.config.set('kodi_webserver_username', data['kodi_webserver_username']);
	self.config.set('kodi_webserver_password', data['kodi_webserver_password']);
	self.logger.info("Successfully saved Kodi settings");
	
	self.writeKodiOptimalisation(data)
	.fail(function(e)
	{
		defer.reject(new error());
	})
	
	return defer.promise;
}

ControllerKodi.prototype.writeBootConfig = function (config) 
{
	var self = this;
	var defer = libQ.defer();
	
	self.updateConfigFile("gpu_mem_1024", self.config.get('gpu_mem_1024'), "/boot/config.txt")
	.then(function (gpu512) {
		self.updateConfigFile("gpu_mem_512", self.config.get('gpu_mem_512'), "/boot/config.txt");
	})
	.then(function (gpu256) {
		self.updateConfigFile("gpu_mem_256", self.config.get('gpu_mem_256'), "/boot/config.txt");
	})
	.then(function (hdmi) {
		self.updateConfigFile("hdmi_force_hotplug", self.config.get('hdmihotplug'), "/boot/config.txt");
	})
	.fail(function(e)
	{
		defer.reject(new Error());
	});
	
	self.commandRouter.pushToastMessage('success', "Configuration update", "A reboot is required, changes have been made to /boot/config.txt");

	return defer.promise;
}

ControllerKodi.prototype.writeSoundConfig = function (soundConfig)
{
	var self = this;
	var defer = libQ.defer();
	
	self.patchAsoundConfig(soundConfig['usedac'])	
	.then(function (kali) {
		
		var value;
		if(soundConfig['kalidelay'])
			value = "0.700000";
		else
			value = "0.000000";
		
		self.updateKodiConfig("audiodelay", value);
		
	})
	
	self.commandRouter.pushToastMessage('success', "Configuration update", "Successfully updated sound settings");
	
	return defer.promise;
}

ControllerKodi.prototype.writeKodiOptimalisation = function (optimalisation)
{
	var self = this;
	var defer = libQ.defer();
	var kodiSettings = '/home/kodi/.kodi/userdata/guisettings.xml';
	
	self.xmlSed('guisoundmode', optimalisation['kodi_gui_sounds'], kodiSettings, false, false)	
	.then(function (keepalive) {
		self.xmlSed('streamsilence', optimalisation['kodi_audio_keepalive'], kodiSettings, false, false);
	})
	.then(function(webserverFallback) {
		self.xmlSed('webserver[[:space:]]', optimalisation['kodi_enable_webserver'], kodiSettings, true, false);
	})
	.then(function (webserver) {
		self.xmlSed('webserver>', optimalisation['kodi_enable_webserver'], kodiSettings, true, false);		
	})
	.then(function (webserverport) {
		self.xmlSed('webserverport', optimalisation['kodi_webserver_port'], kodiSettings, false, true);
	})
	.then(function (webserveruser) {
		self.xmlSed('webserverusername', optimalisation['kodi_webserver_username'], kodiSettings, false, true);
	})
	.then(function (webserverpass) {
		self.xmlSed('webserverpassword', optimalisation['kodi_webserver_password'], kodiSettings, false, true);
	})
	
	self.commandRouter.pushToastMessage('success', "Configuration update", "Successfully optimised Kodi");
	
	return defer.promise;
}

ControllerKodi.prototype.xmlSed = function (setting, value, file, booleanText, defaultAttribute)
{
	var self = this;
	var defer = libQ.defer();
	var castValue;
	var defaultAttributeText = " default=\"true\"";
	
	if((value == true || value == false) && !booleanText)
			castValue = ~~value;
	else
		castValue = value;
	
	var command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed 's|<" + setting + ".*|<" + setting.replace("[[:space:]]", "") + ">" + castValue + "</" + setting.replace("[[:space:]]", "") + ">|g' -i " + file;
	
	if(defaultAttribute)
		command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed 's|<" + setting + ".*|<" + setting + defaultAttributeText + ">" + castValue + "</" + setting + ">|g' -i " + file;
		
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
}

ControllerKodi.prototype.updateConfigFile = function (setting, value, file)
{
	var self = this;
	var defer = libQ.defer();
	var castValue;
	
	if(value == true || value == false)
			castValue = ~~value;
	else
		castValue = value;
	
	var command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed '/^" + setting + "=/{h;s/=.*/=" + castValue + "/};${x;/^$/{s//" + setting + "=" + castValue + "/;H};x}' -i " + file;
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
}

ControllerKodi.prototype.updateAsoundConfig = function (useDac)
{
	var self = this;
	var defer = libQ.defer();
	var command;
	
	if(useDac)
	{
		command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|0|1|g' /etc/asound.conf";
	}
	else
	{
		command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|1|0|g' /etc/asound.conf";
	}
	
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
}

ControllerKodi.prototype.patchAsoundConfig = function(useDac)
{
	var self = this;
	var defer = libQ.defer();
	var pluginName = "Kodi";
	var pluginCategory = "miscellanea";
	
	var cardIndex = useDac == true ? "1" : "0";
	
	// define the replacement dictionary
	var replacementDictionary = [
		{ placeholder: "${CTL_CARD_INDEX}", replacement: cardIndex },
		{ placeholder: "${PCM_CARD_INDEX}", replacement: cardIndex }
	];
	
	self.createAsoundConfig(pluginName, replacementDictionary)
	.then(function (clear_current_asound_config) {
		exec("/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- '/#" + pluginName.toUpperCase() + "/,/#ENDOF" + pluginName.toUpperCase() + "/d' /etc/asound.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				console.log(stderr);
				self.commandRouter.pushConsoleMessage('Could not clear config with error: ' + error);
				self.commandRouter.pushToastMessage('error', "Configuration failed", "Failed to update asound configuration with error: " + error);
				defer.reject();
			}
			
			self.commandRouter.pushConsoleMessage('Cleared previous asound config');
		});
	})
	.then(function (copy_new_config) {
		var cmd = "/bin/echo volumio | /usr/bin/sudo -S /bin/cat /data/plugins/" + pluginCategory + "/" + pluginName + "/asound.section >> /etc/asound.conf";
		fs.writeFile(__dirname + "/" + pluginName.toLowerCase() + "_asound_patch.sh", cmd, 'utf8', function (err) {
			if (err)
			{
				self.commandRouter.pushConsoleMessage('Could not write the script with error: ' + err);
				defer.reject(new Error(err));
			}
		});
	})
	.then(function (executeScript) {
		self.executeShellScript(__dirname + '/' + pluginName.toLowerCase() + '_asound_patch.sh');
		defer.resolve();
	});
	
	self.commandRouter.pushToastMessage('success', "Successful push", "Successfully pushed new ALSA configuration");
	return defer.promise;
}

ControllerKodi.prototype.createAsoundConfig = function(pluginName, replacements)
{
	var self = this;
	var defer = libQ.defer();
	
	fs.readFile(__dirname + "/templates/asound." + pluginName.toLowerCase(), 'utf8', function (err, data) {
		if (err) {
			defer.reject(new Error(err));
		}

		var tmpConf = data;
		for (var rep in replacements)
		{
			tmpConf = tmpConf.replace(replacements[rep]["placeholder"], replacements[rep]["replacement"]);			
		}
			
		fs.writeFile(__dirname + "/asound.section", tmpConf, 'utf8', function (err) {
                if (err)
				{
					self.commandRouter.pushConsoleMessage('Could not write the script with error: ' + err);
                    defer.reject(new Error(err));
				}
                else 
					defer.resolve();
        });
	});
	
	return defer.promise;
}

ControllerKodi.prototype.updateKodiConfig = function (setting, value)
{
	var self = this;
	var defer = libQ.defer();
	var castValue;
	
	if(value == true || value == false)
			castValue = ~~value;
	else
		castValue = value;
	
	var command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|<" + setting + ".*|<" + setting + ">" + castValue + "</" + setting + ">|g' /home/kodi/.kodi/userdata/guisettings.xml";
	
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
	});
	
	return defer.promise;
}
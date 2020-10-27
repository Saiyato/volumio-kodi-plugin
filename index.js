'use strict';

var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var fs = require('fs-extra');
var libNet = require('net');
var libQ = require('kew');

// Define the ControllerKodi class
module.exports = ControllerKodi;

function ControllerKodi(context) 
{
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

};

ControllerKodi.prototype.onVolumioStart = function()
{
	var self = this;
	self.logger.info("Kodi initiated");
	
	this.configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
	self.getConf(this.configFile);
	
	return libQ.resolve();	
};

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
			self.logger.error('The following error occurred while stopping Kodi: ' + error);
			defer.reject();
		}
		else {
			self.logger.info('Stopping Kodi process...');
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
			self.logger.error('The following error occurred while starting KODI: ' + error);
			defer.reject();
		}
		else {
			self.logger.error('Starting Kodi...');
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
		uiconf.sections[1].content[1].value = self.config.get('audiodelay');
		
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

	exec("/usr/bin/sudo /bin/systemctl restart kodi", {uid:1000,gid:1000}, function (error, stdout, stderr) {
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
};

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
};

ControllerKodi.prototype.updateSoundConfig = function (data)
{
	var self = this;
	var defer = libQ.defer();
	
	self.config.set('usedac', data['usedac']);
	self.config.set('audiodelay', data['audiodelay']);
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
};

ControllerKodi.prototype.updateKodiSettings = function (data)
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
	
	self.writeKodiSettings(data)
	.fail(function(e)
	{
		defer.reject(new error());
	})
	
	return defer.promise;
};

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
};

ControllerKodi.prototype.writeSoundConfig = function (soundConfig)
{
	var self = this;
	var defer = libQ.defer();
	
	let cardIndex = soundConfig['usedac'] == true ? "1" : "0";
	let pluginName = 'KODI';
	
	// define the replacement dictionary
	let replacementDictionary = [
		{ placeholder: "${CTL_CARD_INDEX}", replacement: cardIndex },
		{ placeholder: "${PCM_CARD_INDEX}", replacement: cardIndex }
	];
	
	self.updateAsoundConfig(replacementDictionary, pluginName)	
	.then(function (delay) {
		self.xmlSed('audiodelay', soundConfig['audiodelay'], kodiSettings, false, false);
		defer.resolve();
	})
	
	self.commandRouter.pushToastMessage('success', "Configuration update", "Successfully updated sound settings");
	
	return defer.promise;
};

ControllerKodi.prototype.writeKodiSettings = function (optimalisation)
{
	var self = this;
	var defer = libQ.defer();	
	
	var userDefault = false;
	var passDefault = false;
	
	self.xmlSed('guisoundmode', optimalisation['kodi_gui_sounds'], false, false, false)	
	.then(function (keepalive) {
		self.xmlSed('streamsilence', optimalisation['kodi_audio_keepalive'], false, false, false);
		self.xmlSed('<setting id=\"audiooutput.streamsilence\" default=\"true\">', optimalisation['kodi_audio_keepalive'], true, false, true);
	})
	.then(function(webserverFallback) {
		self.xmlSed('webserver[[:space:]]', optimalisation['kodi_enable_webserver'], true, false, false);
	})
	.then(function (webserver) {
		self.xmlSed('webserver>', optimalisation['kodi_enable_webserver'], true, false, false);
		self.xmlSed('<setting id=\"services.webserver\" default=\"true\">', optimalisation['kodi_enable_webserver'], true, false, true);
	})
	.then(function (webserverport) {
		self.xmlSed('webserverport', optimalisation['kodi_webserver_port'], false, false, false);
		self.xmlSed('<setting id=\"services.webserverport\" default=\"true\">', optimalisation['kodi_webserver_port'], true, false, true);
		console.log('port edited');
	})
	.then(function (webserveruser) {
		if(webserveruser == 'kodi')
			userDefault = true;
			
		self.xmlSed('webserverusername', optimalisation['kodi_webserver_username'], false, userDefault, false);
		self.xmlSed('<setting id=\"services.webserverusername\" default=\"true\">', optimalisation['kodi_webserver_username'], true, false, true);
	})
	.then(function (webserverpass) {
		if(webserverpass == '')
			passDefault = true;
		
		self.xmlSed('webserverpassword', optimalisation['kodi_webserver_password'], false, passDefault, false);
		self.xmlSed('<setting id=\"services.webserverpassword\" default=\"true\">', optimalisation['kodi_webserver_password'], true, false, true);
	})
	
	self.commandRouter.pushToastMessage('success', "Configuration update", "Successfully edited Kodi settings");
	
	return defer.promise;
};

ControllerKodi.prototype.xmlSed = function (setting, value, booleanText, defaultAttribute, leiaSetting)
{
	var self = this;
	var defer = libQ.defer();
	let castValue;
	let defaultAttributeText = " default=\"true\"";
	let  file = '/home/kodi/.kodi/userdata/guisettings.xml';
	
	if((value == true || value == false) && !booleanText)
			castValue = ~~value;
	else
		castValue = value;
	
	var command = "/bin/sed -i 's|<" + setting + ".*|<" + setting.replace("[[:space:]]", "").replace(">", "") + ">" + castValue + "</" + setting.replace("[[:space:]]", "").replace(">", "") + ">|g' " + file;
	
	if(defaultAttribute)
		command = "/bin/sed -i 's|<" + setting + ".*|<" + setting.replace(">", "") + defaultAttributeText + ">" + castValue + "</" + setting.replace(">", "") + ">|g' " + file;
	
	if(leiaSetting)
		command = "/bin/sed -i 's|" + setting + ".*|" + setting + castValue + "</setting>|g' " + file;
	
	(function(replace_inline) {		
		exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not replace in file with error: ' + error);
				defer.reject(new Error(error));
			}
		});
	})
	.then(function (restore_file_owner) {
		exec("/usr/bin/sudo /bin/chown kodi:kodi /data/configuration/miscellanea/kodi/kodi_config/userdata/guisettings.xml", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not restore file permissions with error: ' + error);
				defer.reject(new Error(error));
			}
		});
		defer.resolve(restore_file_owner);
	});
	
	return defer.promise;
};

ControllerKodi.prototype.updateConfigFile = function (setting, value, file)
{
	var self = this;
	var defer = libQ.defer();
	var castValue;
	
	if(value == true || value == false)
			castValue = ~~value;
	else
		castValue = value;
	
	var command = 'TMP=$(sed \'/^' + setting + '=/{h;s/=.*/=' + castValue + '/};${x;/^$/{s//' + setting + '=' + castValue + '/;H};x}\' ' + file + ') && echo "$TMP" > ' + file;
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
};

ControllerKodi.prototype.createAsoundSection = function(pluginName, replacements)
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
			
		fs.writeFile("/home/volumio/asound." + pluginName.toLowerCase(), tmpConf, 'utf8', function (err) {
                if (err)
				{
					self.logger.error('Could not write the script with error: ' + err);
                    defer.reject(new Error(err));
				}
                else 
					defer.resolve();
        });
	});
	
	return defer.promise;
};

ControllerKodi.prototype.updateAsoundConfig = function(replacementDictionary, pluginName)
{
	var self = this;
	var defer = libQ.defer();
	
	/* [ Dictionary Array syntax ]
	
	var replacementDictionary = 
	[
		{ placeholder: "${PLACEHOLDER_1}", replacement: VALUE_1 },
		{ placeholder: "${PLACEHOLDER_2}", replacement: VALUE_2 }
	];	
	
	*/
	
	self.createAsoundSection(pluginName, replacementDictionary)
	.then(function (copy_asound_config) {
		exec("/usr/bin/rsync --ignore-missing-args /etc/asound.conf /home/volumio/asound.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not copy config file to temp location with error: ' + error);
				defer.reject(new Error(error));
			}
		});
	})
	.then(function (touch_asound_config) {
		exec("/bin/touch /home/volumio/asound.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not touch config with error: ' + error);
				defer.reject(new Error(error));
			}		
		});
	})
	.then(function (clear_current_asound_config) {
		exec("/bin/sed -i -- '/#" + pluginName + "/,/#ENDOF" + pluginName + "/d' /home/volumio/asound.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not clear config with error: ' + error);
				defer.reject(new Error(error));
			}
		});
	})
	.then(function (copy_asound_contents) {
		exec("/bin/cat /home/volumio/asound." + pluginName.toLowerCase() + " >> /home/volumio/asound.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not copy new config to file with error: ' + error);
				defer.reject(new Error(error));
			}
		});
	})
	.then(function (remove_obsolete_file) {
		exec("/bin/rm /home/volumio/asound." + pluginName.toLowerCase(), {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not copy new config to file with error: ' + error);
				defer.reject(new Error(error));
			}
		});
	})
	.then(function (replace_asound_config) {
		exec("/usr/bin/sudo /bin/mv /home/volumio/asound.conf /etc/asound.conf", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not replace /etc/asound.conf with error: ' + error);
				defer.reject(new Error(error));
			}
		});
	})
	.then(function (activate_asound_config) {
		exec("alsactl -L -R restore", {uid:1000, gid:1000}, function (error, stout, stderr) {
			if(error)
			{
				self.logger.error('Could not reload asound.conf with error: ' + error);
				defer.reject(new Error(error));
			}
		});
		defer.resolve(activate_asound_config);
	});
	
	self.commandRouter.pushToastMessage('success', "Successful push", "Successfully pushed new ALSA configuration");
	return defer.promise;
};
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
	//Perform your installation tasks here
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
        uiconf.sections[0].content[0].value = self.config.get('gpu_mem');
        uiconf.sections[0].content[2].value = self.config.get('hdmihotplug');
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
	// var self = this;
	
	// fs.writeJsonSync(this.configFile, JSON.stringify(conf));
	// self.commandRouter.pushToastMessage('success',"Kodi", "Boot configuration saved");
	
	// return libQ.resolve();
	
	// Obsolete! Config: autosave=true
};

// Public Methods ---------------------------------------------------------------------------------------

ControllerKodi.prototype.updateBootConfig = function (data) 
{
	var self = this;
	var defer = libQ.defer();

	self.config.set('gpu_mem', data['gpu_mem']);
	self.config.set('hdmihotplug', data['hdmihotplug']);
	self.logger.info("Successfully updated configuration");
	
	self.writeBootConfig(self.config)
	.then(function(e){
		self.commandRouter.pushToastMessage('success', "Configuration update", "Successfully wrote the settings to /boot/config.txt");
		defer.resolve({});
	})
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
	
	self.updateConfigFile("gpu_mem", self.config.get('gpu_mem'), "/boot/config.txt")
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

ControllerKodi.prototype.updateConfigFile = function (setting, value, file)
{
	var self = this;
	var defer = libQ.defer();
	var castValue;
	
	if(value == true || value == false)
			castValue = ~~value;
	else
		castValue = value;
	
	var command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|.*" + setting + ".*|" + setting + "=" + castValue + "|g' " + file;
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	self.commandRouter.pushToastMessage('success', "Shell command complete", "Successfully executed shell command.");
	
	return defer.promise;
}
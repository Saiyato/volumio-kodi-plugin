'use strict';

var libQ = require('kew');
var libNet = require('net');
var fs=require('fs-extra');
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
	self.logger.info("Kodi started");
	
	var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);
	    		// self.createVOLSPOTCONNECTFile();
	return libQ.resolve();	
}

ControllerKodi.prototype.getConfigurationFiles = function()
{
	return ['config.json'];
};

// Plugin methods -----------------------------------------------------------------------------
ControllerKodi.prototype.onStop = function() {
	var self = this;

	self.logger.info("Killing Kodi");	

   	return libQ.resolve();
};

ControllerKodi.prototype.onStart = function() {
	var self = this;
    var defer=libQ.defer();

  	self.checkKodiProcess()
        .then(function(e)
        {
            self.logger.info("Kodi started");
        })
        .fail(function(e)
        {
            defer.reject(new Error());
        });

   	return libQ.resolve();
//   	return defer.promise;
};

ControllerKodi.prototype.stop = function() 
{
	// Kill process?
	return libQ.resolve();
};


ControllerKodi.prototype.onRestart = function() 
{
	// Do nothing
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

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
    __dirname+'/i18n/strings_en.json',
    __dirname + '/UIConfig.json')
    .then(function(uiconf)
    {
        uiconf.sections[0].content[0].value = self.config.get('gpu_mem');
        uiconf.sections[0].content[1].value = self.config.get('autostart');
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
	
	self.logger.info('Updating UI config');
};

ControllerKodi.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerKodi.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};

// Public Methods ---------------------------------------------------------------------------------------

ControllerKodi.prototype.checkKodiProcess = function()
{
	// Apply valid check
	return libQ.resolve();
}

ControllerKodi.prototype.updateBootConfig = function (data) 
{
	var self = this;
	var defer = libq.defer();

	self.logger.info('Writing new config values...');
	
	self.config.set('gpu_mem', data['gpu_mem']);
	self.config.set('autostart', data['autostart']);
	self.config.set('hdmihotplug', data['hdmihotplug']);
	
	self.writeBootConfig()
	.then(function(e){
		self.commandrouter.pushtoastmessage('success', "Configuration update", 'Successfully wrote the settings to /boot/config.txt');
	defer.resolve({});
	})
	.fail(function(e)
	{
		defer.reject(new error());
	})


	return defer.promise;
};

ControllerKodi.prototype.writeBootConfig = function () 
{
	var self = this;
	var defer = libQ.defer();
	self.console.log('Trying to write /boot/config.txt')
	.then(function(e)
	{
		var edefer = libQ.defer();
		exec("/usr/bin/sudo /bin/sed -i -- 's/gpu_mem=/#gpu_mem=/g' /boot/config.txt & echo 'gpu_mem=248' | sudo tee -a /boot/config.txt",{uid:1000,gid:1000}, function (error, stdout, stderr) {
		edefer.resolve();
	});
		return edefer.promise;
	})
	.then(function(e)
	{
		self.commandRouter.pushToastMessage('success', "Configuration update", 'A reboot is required, changes have been made to /boot/config.txt');
		defer.resolve({});
	});

	return defer.promise;
}
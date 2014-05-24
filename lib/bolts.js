var _ = require('lodash'),
	async = require('async'),
	camelCase = require('camel-case'),
	fs = require('fs'),
	path = require('path'),
	prompt = require('prompt'),
	wrench = require('wrench');

var HOME = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE,
	CONFIG = '.bolts.json';

function bootstrap(opts, callback) {
	callback = maybeCallback(arguments[arguments.length-1]);
	if (!opts || _.isFunction(opts)) {
		opts = {};
	}

	async.waterfall([

		// feed opts in waterfall
		function(cb) { return cb(null, opts); },

		// load default values
		// loadDefaults,

		// load any relevant config files
		// loadConfig,

		// prompt for any missing required values
		promptForConfig,

		// write completed config to HOME
		// writeConfig,

		// generate the bootstrapped project
		generateProject

	], function(err, results) {
		if (err) { return callback(err); }
		return callback(null, results);
	});
}

module.exports = bootstrap;

/*
function loadDefaults(opts, callback) {
	opts = opts || {};

	async.parallel([

		function(cb) {

		},

		function(cb) {

		}
	], function(err, results) {

	});

	return callback(null, opts);
}

function loadConfig(opts, callback) {
	opts = opts || {};

	try {
		// explicit config file
		if (opts.config) {
			fs.readFile(opts.config, function(err, data) {
				return callback(null, JSON.parse(data));
			});

		// try to load local config file
		} else {
			var config = findConfig();
			return callback(null, config ? require(config) : null);
		}
	} catch (e) {
		return callback(e);
	}
}
*/

function promptForConfig(config, callback) {
	config = config || {};

	var title = prepTitle();

	console.log(title);
	console.log('┌──'.grey + ' Gimme some info and I\'ll create an npm-ready node.js module for you.');
	console.log('│'.grey);
	console.log('▼'.grey);

	prompt.message = '⚙'.green + '⚙'.white;
	prompt.delimiter = ' ';
	prompt.override = config;

	var schema = {
		properties: {
			project: {
				description: 'project name',
				required: true
			},
			description: {
				description: 'description',
				required: true
			},
			name: {
				description: 'author name',
				required: true
			},
			email: {
				description: 'author email',
				required: true
			},
			github: {
				description: 'github username',
				required: true
			}
		}
	};

	Object.keys(schema.properties).forEach(function(key) {
		schema.properties[key].description += ':';
	});

	prompt.start();
	prompt.get(schema, function (err, result) {
		if (err) { return callback(err); }

		config.projectCamelCase = camelCase(result.project);
		config.devDependencies = JSON.stringify({
			'grunt': '~0.4.5',
			'grunt-mocha-test': '~0.10.2',
			'grunt-contrib-jshint': '~0.10.0',
			'grunt-contrib-clean': '~0.5.0',
			'istanbul': '~0.2.10',
			'mocha': '~1.19.0',
			'should': '~3.3.1'
		}, null, '\t');
		return callback(null, _.extend(config, result));
	});
}

/*
function writeConfig(config, callback) {
	config = config || {};
	var configFile = path.join(HOME, CONFIG);
	fs.writeFile(configFile, JSON.stringify(config, null, 2), function(err) {
		return callback(err, config, configFile);
	});
}
*/

function generateProject(config, callback) {
	config = config || {};

	var dest = path.resolve(config.project);
	if (fs.existsSync(dest) && !config.force) {
		return callback('"' + config.project + '" already exists. Use --force to overwrite.');
	}
	//wrench.mkdirSyncRecursive(dest, 0755);

	// copy all files in
	wrench.copyDirSyncRecursive(path.join(__dirname, '..', 'src'), dest, {
		forceDelete: true
	});
	wrench.mkdirSyncRecursive(path.join(dest, 'node_modules'));

	// iterate through all files and update them with templates
	wrench.readdirSyncRecursive(dest).forEach(function(file) {
		var fullpath = path.join(dest, file);
		if (fs.statSync(fullpath).isFile()) {
			fs.writeFileSync(fullpath, _.template(fs.readFileSync(fullpath, 'utf8'), config));
		}
	});

	// rename source project files
	fs.renameSync(path.join(dest, 'lib', 'module.js'), path.join(dest, 'lib', config.project + '.js'));
	fs.renameSync(path.join(dest, 'test', 'module_test.js'), path.join(dest, 'test', config.project + '_test.js'));

	return callback(null, config);
}

// helpers
function findConfig() {
	var result = null,
		configs = [
			path.resolve(CONFIG),
			path.join(HOME, CONFIG)
		];

	// see if we have a config saved in either CWD or HOME
	configs.every(function(config) {
		if (fs.existsSync(config)) {
			result = config;
			return false;
		}
		return true;
	});

	return result;
}

function prepTitle() {
	var title = fs.readFileSync(path.join(__dirname, '..', 'assets', 'title.txt'), 'utf8'),
		newTitle = '';

	// var nodeRange = [0,25],
	// 	dashRange = [25,31],
	// 	bootstrapRange = [31,78],
	// 	specs = [
	// 		{ range: nodeRange, color: 'green' },
	// 		{ range: dashRange, color: 'white' },
	// 		{ range: bootstrapRange, color: 'cyan' }
	// 	],
	// 	newTitle = '';

	// // colorize each range
	title.split('\n').forEach(function(line) {
		newTitle += '            ' + line + '\n';
	});

	// return newTitle.replace(/\n$/,'').bold;

	return '\n' + newTitle.replace(/\$/g, '$'.red).replace(/([\\\/_|])/g, '$1'.grey).bold + '\n';
}

function maybeCallback(cb) {
	return _.isFunction(cb) ? cb : function(err) { if (err) { throw err; } };
}
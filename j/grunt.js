module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig(
		{
			concat: {
				dist: {
					src:  [
						// order is important. All rely on TipTap, Action relies on Gesture
						'TipTap/TipTap.js',
						'TipTap/Fsm.js',
						'TipTap/Gesture.js',
						'TipTap/Action.js',
						'TipTap/Finger.js',
						'TipTap/Mouse.js',
						'TipTap/Pointer.js',
						'TipTap/Position.js',
						'TipTap/RotoZoomer.js',
						'TipTap/Router.js',
						'TipTap/Touch.js'
					],
					dest: 'dist/TipTap.js'
				}
			},
			min:    {
				dist: {
					src:  ['dist/TipTap.js'],
					dest: 'dist/TipTap.min.js'
				}
			}
		}
	);

	// Default task.
	grunt.registerTask('default', 'concat min');

};

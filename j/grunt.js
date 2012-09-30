module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig(
		{
			concat: {
				dist: {
					src:  [
						// order is important. All rely on TipTap, Action relies on Gesture
						'src/TipTap.js',
						'src/Fsm.js',
						'src/Gesture.js',
						'src/Action.js',
						'src/Finger.js',
						'src/Mouse.js',
						'src/PointerInfos.js',
						'src/Position.js',
						'src/RotoZoomer.js',
						'src/Router.js',
						'src/Touch.js'
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

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        ts: {
            dist: {
                tsconfig: './tsconfig.json'
            }, 
            live: {
                tsconfig: './tsconfig.json', 
                watch: "src/main/ts/**/*"
            }
        },
        watch: {
            default: {
                files: ["src/main/ts/**/*", "index.html", "index.css"], 
                tasks: ['ts:dist'],
                options: {
                    livereload: true
                }                    
            }
        },
        connect: {
            server: {
                options: {
                    livereload: true
                }
            }    
        },
        clean: {
            all: ["build", "dist", "dist.zip", "js13k.zip"],
            dist: ["ts:dist"]
        },
        'closure-compiler': {
            js13k: {
                closurePath: 'libbuild/closure-compiler-v20180805',
                js: 'build/out.js',
                jsOutputFile: 'dist/out.min.js',
                maxBuffer: 500,
                reportFile: 'closure.txt',
                options: {
                    compilation_level: 'ADVANCED_OPTIMIZATIONS',
                    language_in: 'ECMASCRIPT5',
                    // ES6 output is not supported!!
                    language_out: 'ECMASCRIPT5', 
                    externs: 'src/main/externs/externs.js'
                }
            }
		},
		cssmin: {
			options: {
			},
			target: {
			  	files: {
					'dist/index.css': ['dist/index.css']
			  	}
			}
		},
		htmlmin: {                                     
			dist: {
				options: {
					removeComments: true,
					collapseWhitespace: true
				},
				files: {                                   
					'dist/index.html': 'dist/index.html'
				}	
			}
		},
        inline: {
            dist: {
                src: 'dist/index.html',
                dest: 'dist/index.html'
            }
        },
        replace: {
            js13k: {
                src: ['dist/out.min.js'],
                overwrite: true,
                replacements: [{ // turn functions into => form
                    from: /(=|:|return |\(|,)function\(([^\)]*)\)/g, 
                    to:"$1($2)=>"
                }, { // replace all function decls with lets
                    from: /function ([^\)]+)(\([^\)]*\))/g, 
                    to: "var $1=$2=>"
                }, { // shorter version of false (very safe)
                    from: /false/g, 
                    to: "!1"
                }, { // shorter version of true (very safe)
                    from: /true/g, 
                    to: "!0"
                }, { // remove all whitespace
                    from: /(\n|\r)/g,
                    to: ""
                }, { // remove whitespace from GLSL
                    from: /(\;|\{|\})( *\\n *)/g,
                    to: "$1"
                }, { // remove remaining whitespace from GLSL
                    from: /( *\\n *)/g,
                    to: "\\n"
                }, { // declare a replacement for void 0
                    from: /^var /,
                    to: "var _,"
                }, {
                    from: /,void 0(,|\))/g,
                    to: "$1"
                }, {
                    from: /(void 0|null)/g,
                    to: "_"
                }/*, { // deteect all non-duplicated var declarations with two or more characters in them
                    from: /var ((([a-zA-Z_$][a-zA-Z0-9_$])=(([^,\[\}\(;]+|\[[^\]]*\])|[^\(,;]+\([^\)]*\))+,?)*(;|\}))/g,
                    to: function(word, index, fullText, regexMatches) {
                        let parts = regexMatches[0].split(',');
                        let varCounts = this.varCounts;
                        if( varCounts == null ) {
                            varCounts = {}
                            this.varCounts = varCounts;
                        }
                        for( let part of parts ) {
                            let subparts = part.split('=');
                            if( subparts.length == 2 ) {
                                let name = subparts[0];
                                let varCount = varCounts[name];
                                if( varCount == null ) {
                                    varCount = 1;
                                } else {
                                    varCount++;
                                }
                                varCounts[name] = varCount;
                            }
                        }
                        return word;
                    }
				}*/]
            }, 
            js13k2: { // second pass for the bits that we changed above
                src: ['dist/out.min.js'],
                overwrite: true,
                replacements: [{// fix up all the missing semicolons from the previous
                    from: /\}(var |[^;= \(,\}]+=)/g, 
                    to: "};$1"

                }/*, { // remove all non-duplicated var declarations with two or more characters in them
                    from: /var ((([a-zA-Z_$][a-zA-Z0-9_$])=(([^,\[\}\(;]+|\[[^\]]*\])|[^\(,;]+\([^\)]*\))+,?)*(;|\}))/g,
                    to: function(word, index, fullText, regexMatches) {
                        let parts = regexMatches[0].split(',');
                        let varCounts = this.varCounts;
                        let duplicated = false;
                        for( let part of parts ) {
                            let subparts = part.split('=');
                            if( subparts.length == 2 ) {
                                let name = subparts[0];
                                let varCount = varCounts[name];
                                if( varCount > 1 ) {
                                    duplicated = true;
                                }
                            }
                        }
                        if( !duplicated ) {
                            // remove the var, assume the previously declared one will be OK
                            word = regexMatches[0];
                        }
                        return word;
                    }
				}*//*, { // remove all var declarations with two or more characters in them
                    from: /var ([a-zA-Z_$][a-zA-Z0-9_$]+=(([^,\[\}\(;]+|\[[^\]]*\])|[^\(,;]+\([^\)]*\))+,?)*(;|\})/g, 
                    to: "$1"
                }*//*, { // remove vars from old functions
                    from: /(\{|;)var ([a-zA-Z_$][a-zA-Z0-9_$]+=\([^\)]*\)=>)/g, 
                    to: "$1$2"
                }*/]
            },
            html: {
                src: ['dist/index.html'],
                overwrite: true,
                replacements: [{
                    from: /build\/out\.js/g, 
                    to:"out.min.js"
                }]
            }
        },
        copy: {
            html: {
                files: [
                    {expand: true, src: ['index.html'], dest: 'dist/'},
                    {expand: true, src: ['index.css'], dest: 'dist/'}
                ]
            }
        },
        devUpdate: {
            main: {
                options: {
                    //task options go here 
                    updateType: 'force',
                    reportUpdated: true
                }
            }
        }
    });

    // clean
    grunt.loadNpmTasks('grunt-contrib-clean');
    // load the plugin that provides the closure compiler
    grunt.loadNpmTasks('grunt-closure-compiler');
    // Load the plugin that provides the "TS" task.
    grunt.loadNpmTasks('grunt-ts');
    // copy
    grunt.loadNpmTasks('grunt-contrib-copy');
    // replace text in file
    grunt.loadNpmTasks('grunt-text-replace');
    // update version
    grunt.loadNpmTasks('grunt-dev-update');
    // inline js 
    grunt.loadNpmTasks('grunt-inline');
    // live reload
    grunt.loadNpmTasks('grunt-contrib-watch');
    // server for live reload
    grunt.loadNpmTasks('grunt-contrib-connect');
    // copying html
	grunt.loadNpmTasks('grunt-contrib-copy');
	// minifying css
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	// minifying html
	grunt.loadNpmTasks('grunt-contrib-htmlmin');

    // Default task(s).
    grunt.registerTask('reset', ['clean:all']);
    grunt.registerTask('prod', ['ts:dist']);
    grunt.registerTask('js13k', ['prod', 'closure-compiler:js13k', 'replace:js13k', 'replace:js13k2', 'copy','cssmin','replace:html', 'inline', 'htmlmin']);
    grunt.registerTask('default', ['prod', 'connect', 'watch']);

};
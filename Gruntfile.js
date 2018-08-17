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
                files: ["src/main/ts/**/*", "index.html"], 
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
                replacements: [/*{
                    from: /(=|:|return |\(|,)function\(([^\)]*)\)/g, 
                    to:"$1($2)=>"
                }, {
                    from: /var [^;=]*;/g, 
                    to: ""
                }*/, {
                    from: /false/g, 
                    to: "!1"
                }, {
                    from: /true/g, 
                    to: "!0"
                }, {
                    from: /(\n|\r)/g,
                    to: ""
                }/*, {
                    // note, this is a symptom that TS is initalizing your local vars (which you don't want)
                    from: /void 0/g,
                    to: "0"
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
                    {expand: true, src: ['index.html'], dest: 'dist/'}
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

    // Default task(s).
    grunt.registerTask('reset', ['clean:all']);
    grunt.registerTask('prod', ['ts:dist']);
    grunt.registerTask('js13k', ['prod', 'closure-compiler:js13k', 'replace:js13k', 'copy','replace:html', 'inline']);
    grunt.registerTask('default', ['prod', 'connect', 'watch']);

};
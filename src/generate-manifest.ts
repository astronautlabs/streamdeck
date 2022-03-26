#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import rimraf from 'rimraf';
import __copy from 'copy';
import * as manifest from './manifest';

async function copy(from: string, to: string) {
    return new Promise((resolve, reject) => __copy(from, to, (err, files) => err ? reject(err) : resolve(files)));
}

async function renderTemplate(templateFile: string, destFile: string, values: Record<string,string>) {
    fs.writeFileSync(
        destFile, 
        Object
            .keys(values)
            .reduce(
                (file, key) => file.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), values[key]),
                fs.readFileSync(templateFile).toString()
            )
    );
}

async function main(args: string[]) {
    if (args.length !== 1) {
        console.log(`usage: [com.example.plugin.sdPlugin]`);
        console.log(`       [entrypoint.js] [manifest-file.json]`);
        process.exit(1);
    }

    let resourceDir = path.join(__dirname, '..', 'resources');
    let manifestDir = path.resolve(process.cwd(), args[0]);
    let entrypoint = path.join(manifestDir, `index.js`);
    let manifestFile = path.join(manifestDir, `manifest.json`);

    console.log(`Generating manifest '${manifestFile}' from plugin '${entrypoint}'`);
    require(entrypoint);
    let manifest: manifest.Manifest = globalThis.StreamDeckPlugin.manifest;

    manifest.CodePath = 'index.html';
    
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, undefined, 4));
    renderTemplate(path.join(resourceDir, 'index.html'), path.join(manifestDir, 'index.html'), {
        uuid: `com.example.todo`
    });
    renderTemplate(path.join(resourceDir, 'pi.html'), path.join(manifestDir, 'pi.html'), {
        uuid: `com.example.todo`
    });
    await copy(path.join(resourceDir, 'images/**'), path.join(manifestDir, 'images'));
    await copy(path.join(resourceDir, 'css/**'), path.join(manifestDir, 'css'));
}

main(process.argv.slice(2));
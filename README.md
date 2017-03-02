# node-multi-storage-local

_node-multi-storage-local_ is a provider for the NodeJS module [node-multi-storage](https://www.npmjs.com/package/node-multi-storage).
It provides saving and reading files to/from the local filesystem.

Since version 2.0 of this module, node-multi-storage v2.0 or newer is needed.

# Usage

Install `node-multi-storage-local` and `node-multi-storage`:

    npm install --save node-multi-storage node-multi-storage-local
    
Create an instance of the local storage provider:

    let MultiStorageLocal = require('node-multi-storage-local');
    let localStorageProvider = new MultiStorageLocal(options);
    
and add it to the MultiStorage instance (or create it wit the provider):

    let MultiStorage = require('node-multi-storage');
    let storage = new MultiStorage({providers: [localStorageProvider]});
    
    // or
    
    let MultiStorage = require('node-multi-storage');
    let storage = new MultiStorage();
    storage.addProvider(localStorageProvider);
    
The options passed when creating a new instance of _node-multi-storage-local_ has these fields:

- `baseDirectory`: The directory where all files are saved. Defaults to the current working directory.
- `createDirectories`: If set to `true`, all needed intermediate directories are created whenever needed. Defaults to `true`.
- `flattenDirectories`: If set to `true` all directory hierarchies are flattened to so that there are no subdirectories. 
This is useful when developing an application. Subdirectory structures are expressed by inserting a – in the file name. Defaults to `false`. 

Further information on how to save and read files, see the documentation of [node-multi-storage](https://www.npmjs.com/package/node-multi-storage).

# Hints

- The generated URLs are relative to the base directory. That means that they are still working after this
directory has been moved.
- When including the _path_ option, `get` and `getStream` consider this is a subdirectory path.
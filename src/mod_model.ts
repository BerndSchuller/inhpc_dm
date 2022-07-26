// /** Modified FileBrowserModel class and namespace from @jupyterlab/filebrowser
//  *  - includes adjusted to use external resourses
//  *  - 
//  *  - just still in here as reference
//  */
 
// // Copyright (c) Jupyter Development Team.
// // Distributed under the terms of the Modified BSD License.

// import { 
//   IDocumentManager
// } from '@jupyterlab/docmanager';
// import { IStateDB } from '@jupyterlab/statedb';
// import {
//   ITranslator
// } from '@jupyterlab/translation';
// import { Poll } from '@lumino/polling';

// import { 
//   FileBrowserModel,
//   // IUploadModel 
// } from '@jupyterlab/filebrowser';

// /**
//  * The maximum upload size (in bytes) for notebook version < 5.1.0
//  */
// export const LARGE_FILE_SIZE = 15 * 1024 * 1024;

// /**
//  * The size (in bytes) of the biggest chunk we should upload at once.
//  */
// export const CHUNK_SIZE = 1024 * 1024;

// /**
//  * An implementation of a file browser model.
//  *
//  * #### Notes
//  * All paths parameters without a leading `'/'` are interpreted as relative to
//  * the current directory.  Supports `'../'` syntax.
//  */
// export class dm_FileBrowserModel extends FileBrowserModel{//implements IDisposable {
//   /**
//    * Construct a new file browser model.
//    */
//   constructor(options: FileBrowserModel.IOptions) {
//     super(options);
//   }//constructor

//   /**
//    * The document manager instance used by the file browser model.
//    */
//   readonly manager: IDocumentManager;


//   //Here were some debuggersteps as console.log s maybe should be adapted somehow?
//   // /**
//   //  * Change directory.
//   //  *
//   //  * @param path - The path to the file or directory.
//   //  *
//   //  * @returns A promise with the contents of the directory.
//   //  */
//   // async cd(newValue = '.'): Promise<void> {
	
//   //   if (newValue !== '.') {
//   //     newValue = this.manager.services.contents.resolvePath(
//   //       this._model.path,
//   //       newValue
//   //     );
//   //   } else {
//   //     newValue = this._pendingPath || this._model.path;
//   //   }
//   //   if (this._pending) {
//   //     // Collapse requests to the same directory.
//   //     if (newValue === this._pendingPath) {
//   //       return this._pending;
//   //     }
//   //     // Otherwise wait for the pending request to complete before continuing.
//   //     await this._pending;
//   //   }
//   //   const oldValue = this.path;
//   //   const options: Contents.IFetchOptions = { content: true };
//   //   this._pendingPath = newValue;
//   //   if (oldValue !== newValue) {

//   //     this._sessions.length = 0;
//   //   }
//   //   const services = this.manager.services;
//   //   this._pending = services.contents
//   //     .get(newValue, options)
//   //     .then(contents => {
//   //       if (this.isDisposed) {
//   //         return;
//   //       }
//   //       this.handleContents(contents);
//   //       this._pendingPath = null;
//   //       this._pending = null;
//   //       if (oldValue !== newValue) {
//   //         // If there is a state database and a unique key, save the new path.
//   //         // We don't need to wait on the save to continue.
//   //         if (this._state && this._key) {
//   //           void this._state.save(this._key, { path: newValue });
//   //         }

//   //         this._pathChanged.emit({
//   //           name: 'path',
//   //           oldValue,
//   //           newValue
//   //         });
//   //       }
//   //       this.onRunningChanged(services.sessions, services.sessions.running());
//   //       this._refreshed.emit(void 0);
//   //     })
//   //     .catch(error => {
//   //       this._pendingPath = null;
//   //       this._pending = null;
//   //       if (
//   //         error.response &&
//   //         error.response.status === 404 &&
//   //         newValue !== '/'
//   //       ) {
//   //         error.message = this._trans.__(
//   //           'Directory not found: "%1"',
//   //           this._model.path
//   //         );
//   //         console.error(error);
//   //         this._connectionFailure.emit(error);
//   //         return this.cd('/');
//   //       } else {
//   //         this._connectionFailure.emit(error);
//   //       }
//   //     });
//   //   return this._pending;
//   // }

// }//end class

// /**
//  * The namespace for the `FileBrowserModel` class statics.
//  */
// export namespace dm_FileBrowserModel {
//   /**
//    * An options object for initializing a file browser.
//    */
//   export interface IOptions {
//     /**
//      * Whether a file browser automatically loads its initial path.
//      * The default is `true`.
//      */
//     auto?: boolean;

//     /**
//      * An optional `Contents.IDrive` name for the model.
//      * If given, the model will prepend `driveName:` to
//      * all paths used in file operations.
//      */
//     driveName?: string;

//     /**
//      * A document manager instance.
//      */
//     manager: IDocumentManager;

//     /**
//      * The time interval for browser refreshing, in ms.
//      */
//     refreshInterval?: number;

//     /**
//      * When the model stops polling the API. Defaults to `when-hidden`.
//      */
//     refreshStandby?: Poll.Standby | (() => boolean | Poll.Standby);

//     /**
//      * An optional state database. If provided, the model will restore which
//      * folder was last opened when it is restored.
//      */
//     state?: IStateDB;

//     /**
//      * The application language translator.
//      */
//     translator?: ITranslator;
//   }
// }

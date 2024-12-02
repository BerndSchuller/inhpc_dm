/**
 * Filetree widget based on jupyter-fs and filetree
 */


import {
  ContentsProxy, TreeFinderWidget
} from 'jupyter-fs';

import {
  JupyterFrontEnd
} from '@jupyterlab/application';


export class dm_FileTree extends TreeFinderWidget {
  constructor(
    app : JupyterFrontEnd,
    url : string
  ){
    let columns = Array<keyof ContentsProxy.IJupyterContentRow>();
    let rootPath = "";
    super({
      app, columns, rootPath
    });

  };

};

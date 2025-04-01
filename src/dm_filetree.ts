/**
 * Filetree widget based on jupyter-fs
 */

import {
  ContentsProxy, TreeFinderWidget
} from 'jupyter-fs';

import {
  JupyterFrontEnd
} from '@jupyterlab/application';

import { Toolbar} from "@jupyterlab/apputils";

import { PanelLayout, Widget } from "@lumino/widgets";

export class dm_FileTreePanel extends Widget {
  constructor(
    app : JupyterFrontEnd,
    drive : string
  ){
    super();
    this.app = app;
    this.node.classList.add("jfs-mod-notRenaming");
    this.drive = drive;
    this.addClass("jp-tree-finder-sidebar");
    this.toolbar = new Toolbar();
    this.toolbar.addClass("jp-tree-finder-toolbar");
    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addWidget(this.toolbar);
    if (this.drive){
      this.treefinder = new dm_FileTree(app, drive);
      (this.layout as PanelLayout).addWidget(this.treefinder);
    }
  }

  setEndpoint(drive: string){
    this.drive = drive;
    (this.layout as PanelLayout).removeWidget(this.treefinder);
    this.treefinder = new dm_FileTree(this.app, drive);
    (this.layout as PanelLayout).addWidget(this.treefinder);
    this.update();
  }

  getSelectedDir(): string | null {
    var sel: dm_FileTreeSelection[] = this.getSelected();
    if(sel.length==1 && sel[0].isDir){
      return sel[0].path;
    }
    else{
      return this.getCurrentDir();
    }
  }

  getSelected(): dm_FileTreeSelection[]{
    var result: dm_FileTreeSelection[] = [];
    this.treefinder.model.selection.forEach((item)=>{
      console.log("selected: "+JSON.stringify(item));
      var x = new dm_FileTreeSelection();
      x.drive = this.drive;
      x.path = item.pathstr;
      x.isDir = "dir"==item.row.kind;
      console.log("--> "+JSON.stringify(x));
      result.push(x);
    });
    return result;
  }

  getCurrentDir(): string {
    var result = this.treefinder.model.root.pathstr
    if (result.includes("/")){
      return result
    }
    else {
      return result+"/"
    }
  
  }
  toolbar: Toolbar;
  treefinder: dm_FileTree;
  drive: string;
  app: JupyterFrontEnd;
};

export class dm_FileTree extends TreeFinderWidget {
  constructor(
    app : JupyterFrontEnd,
    drive : string
  ){
    let columns = Array<keyof ContentsProxy.IJupyterContentRow>();
    let rootPath = drive;
    super({
      app, columns, rootPath
    });

  };

};

export class dm_FileTreeSelection {
  constructor(){};
  path: string;
  drive: string;
  isDir: boolean = false;
}
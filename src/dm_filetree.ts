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
    this.treefinder = new dm_FileTree(app, drive);
    this.layout = new PanelLayout();

    (this.layout as PanelLayout).addWidget(this.toolbar);
    (this.layout as PanelLayout).addWidget(this.treefinder);
  }

  setEndpoint(drive: string){
    this.drive = drive;
    (this.layout as PanelLayout).removeWidget(this.treefinder);
    this.treefinder = new dm_FileTree(this.app, drive);
    (this.layout as PanelLayout).addWidget(this.treefinder);
    this.update();
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

/**
 * Filetree widget based on jupyter-fs
 */

import {
  ContentsProxy, TreeFinderWidget
} from 'jupyter-fs';

import {
  JupyterFrontEnd
} from '@jupyterlab/application';

//import { Toolbar} from "@jupyterlab/apputils"; deprecated was moved to ui-components
import { Toolbar} from "@jupyterlab/ui-components";

import { PanelLayout, Widget } from "@lumino/widgets";

import {
  WidgetTracker, 
} from "@jupyterlab/apputils";

//aequivalent of TreeFinderSidebar in jupyter-fs
export class dm_FileTreePanel extends Widget {
  constructor(
    app : JupyterFrontEnd,
    drive : string
  ){
    super();
    this.app = app;
    this.node.classList.add("jfs-mod-notRenaming");
    this.drive = drive;
    this.addClass("jp-tree-finder-panel");

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

  getSelectedDir(): string | null {
    var sel: dm_FileTreeSelection[] = this.getSelected();
    if(sel.length==1 && sel[0].isDir){
      return sel[0].path;
    }
    else{
      return null;
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

export class dm_TreeFinderTracker extends WidgetTracker<dm_FileTreePanel> {

  async add(finder: dm_FileTreePanel) {
    this._dm_finders.set(finder.id, finder);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    finder.disposed.connect(this._onWidgetDisposed, this);

    return super.add(finder);
  }

  remove(finder: dm_FileTreePanel) {
    this._dm_finders.delete(finder.id);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    finder.disposed.disconnect(this._onWidgetDisposed, this);
  }

  private _onWidgetDisposed(finder: dm_FileTreePanel) {
    this.remove(finder);
  }
  
  private _dm_finders = new Map<string, dm_FileTreePanel>();
}
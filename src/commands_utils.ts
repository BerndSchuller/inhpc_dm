import { JupyterFrontEnd } from "@jupyterlab/application";
import { DisposableSet, IDisposable } from "@lumino/disposable";
import { TreeFinderTracker } from "jupyter-fs";


export const dm_commandNames = [
    "dm_open",
    "dm_copy"

] as const;

export const dm_commandIDs = Object.fromEntries(dm_commandNames.map(
    name => [name, `dm_treefinder:${name}`]
  )) as dm_CommandIDs;
  export type dm_CommandIDs = {[k in typeof dm_commandNames[number]]: string};

  

export function createCommands(
    app: JupyterFrontEnd,
    dm_tracker: TreeFinderTracker
): IDisposable {
    return[
        //the static list of commands

        app.commands.addCommand(dm_commandIDs.dm_open, {
            execute: args => dm_tracker.currentWidget!.treefinder.model!.openSub.next(dm_tracker.currentWidget!.treefinder.selection?.map(c => c.row)),
            label: "Open",
            isEnabled: () => !!dm_tracker.currentWidget,
          }),
    ].reduce((set: DisposableSet, d) => {
        set.add(d); return set;
    }, new DisposableSet());
}
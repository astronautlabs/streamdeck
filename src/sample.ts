import { Plugin, Action } from "./plugin";

export class SamplePlugin extends Plugin {
    actions = [ SamplePluginAction ];
}

export class SamplePluginAction extends Action {
    plugin: SamplePlugin;
}

SamplePlugin.run();
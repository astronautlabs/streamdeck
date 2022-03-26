/// <reference types="reflect-metadata" />

export type Constructor<T> = { new(...args): T; }
import * as manifest from './manifest';

export interface OSConstraint {
    platform: 'mac' | 'windows' | 'linux';
    minimumVersion: string;
}

export interface ActionState {
    image: string;
    titleAlignment: 'top' | 'middle' | 'bottom';
    fontSize: number;
}

export interface ActionSpec {
    class: Constructor<Action>;
    icon: string;
    name: string;
    states: ActionState[];
    supportedInMultiActions?: boolean;
    tooltip: string;
    uuid: string;
}

export class StreamDeck {
    setSettings() {}
    getSettings() {}
    setGlobalSettings() {}
    getGlobalSettings() {}
    openUrl() {}
    logMessage() {}
    setTitle() {}
    setImage() {}
    showAlert() {}
    showOk() {}
    setState() {}
    switchToProfile() {}
    sendToPropertyInspector() {}
    sendToPlugin() {}
}

export interface Event {
    event: string;
}

export interface DeviceEvent extends Event {
    device: string;
    deviceInfo: {
        name: string;
        type: number;
        size: {
            columns: number;
            rows: number;
        }
    };
}

export interface ApplicationEvent extends Event {
    event: 'applicationDidLaunch' | 'applicationDidTerminate';
    payload: {
        application: string;
    }
}

export interface ActionEvent<T = unknown> extends Event {
    action: string;
    context: string;
    device: string;
    payload: T;
}

export interface ActionInfo {
    action: unknown;
}

export class PropertyInspector {
    private _uuid: string;
    private _registerEvent: string;
    private _info: StreamDeckInfo;
    get info() { return this._info; }
    private socket: WebSocket;
    private _actionInfo: ActionInfo;
    get actionInfo() { return this._actionInfo; }
    
    private connect(port: number, uuid: string, registerEvent: string, info: string, actionInfo: string) {
        this._uuid = uuid;
        this._registerEvent = registerEvent;
        this._info = JSON.parse(info) as StreamDeckInfo;
        this._actionInfo = JSON.parse(actionInfo) as ActionInfo;

        this.socket = new WebSocket(`ws://localhost:${port}`);
        this.socket.addEventListener('open', () => this.register());
        this.socket.addEventListener('message', ev => this.onEvent(JSON.parse(ev.data)));
    }

    sendMessage<T = any>(message : T) {
        this.socket.send(JSON.stringify(message));
    }

    private _settingsReceivers: Function[] = [];
    private _globalSettingsReceivers: Function[] = [];

    getSettings(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sendMessage({
                event: 'getSettings',
                context: this._uuid
            });
            this._settingsReceivers.push(resolve);
        });
    }

    getGlobalSettings(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sendMessage({
                event: 'getGlobalSettings',
                context: this._uuid
            });
            this._globalSettingsReceivers.push(resolve);
        })
    }

    setGlobalSettings(settings: any) {
        this.sendMessage({
            event: 'setGlobalSettings',
            context: this._uuid,
            payload: settings
        })
    }

    setSettings(settings: any) {
        this.sendMessage({
            event: 'setSettings',
            context: this._uuid,
            payload: settings
        });
    }
    
    openUrl(url: string) {
        this.sendMessage({
            event: 'openUrl',
            payload: { url }
        });
    }
    
    logMessage(message: string) {
        this.sendMessage({
            event: 'logMessage',
            payload: { message }
        });
    }

    sendToPlugin(payload: any) {
        this.sendMessage({
            event: 'sendToPlugin',
            action: this._actionInfo.action,
            context: this._uuid,
            payload
        });
    }

    protected receiveFromPlugin(data: any) {}
    
    protected onEvent(event: Event) {
        if (event.event === 'didReceiveSettings') {
            this._settingsReceivers.shift()(event['payload']);
            return;
        } else if (event.event === 'didReceiveGlobalSettings') {
            this._globalSettingsReceivers.shift()(event['payload']);
            return;
        } else if (event.event === 'sendToPropertyInspector') {
            this.receiveFromPlugin(event['payload']);
        }
    }

    private register() {
        this.sendMessage({
            event: this._registerEvent,
            uuid: this._uuid
        });
    }

    static run<T extends PropertyInspector>(this: Constructor<T>): T {
        let propertyInspector = new this();
        globalThis.connectElgatoStreamDeckSocket = (...args) => (propertyInspector.connect as any)(...args);
        return propertyInspector;
    }
}

export interface StaticProfile {
    name: string;
    deviceType: string;
    readOnly?: boolean;
    dontAutoSwitchWhenInstalled?: boolean;
}

export class Plugin {
    streamDeck: StreamDeck;
    actions: Constructor<Action>[];
    propertyInspector?: Constructor<PropertyInspector>;
    author?: string;
    category?: string;
    categoryIcon?: string;
    codePath?: string;
    codePathMac?: string;
    codePathWin?: string;
    defaultWindowSize?: [width: number, height: number];
    profiles?: StaticProfile[];
    propertyInspectorPath?: string;
    description?: string;
    name?: string;
    icon?: string;
    url?: string;
    version?: string;
    os?: OSConstraint[] = [
        { platform: 'mac', minimumVersion: '10.11' },
        { platform: 'windows', minimumVersion: '10' }
    ];
    sdkVersion?: number = 2;
    software?: { minimumVersion: string } = { minimumVersion: '4.1' };
    applicationsToMonitor? : Record<'mac' | 'windows' | 'linux', string[]>;

    private _actionSpecs: ActionSpec[] = [];
    get actionSpecs() { return this._actionSpecs; }

    private validateManifestItem(path: () => any) {
        if (typeof path() === 'undefined') {
            throw new Error(`A value for ${path.toString().slice(6).replace(/\bthis\.\b/, `${this.constructor.name}#`)} is required`);
        }
    }

    private validateManifestItems(paths: (() => any)[]) {
        for (let path of paths)
            this.validateManifestItem(path);
    }

    get manifest(): manifest.Manifest {
        this.validateManifestItems([
            () => this.uuid,
            () => this.actions,
            () => this.author,
            () => this.codePath,
            () => this.description,
            () => this.icon,
            () => this.name,
            () => this.version,
            () => this.sdkVersion,
            () => this.os,
            () => this.software
        ]);

        return {
            Actions: this.actionSpecs.map(a => (<manifest.Action>{
                Icon: a.icon,
                Name: a.name,
                States: a.states.map(s => (<manifest.ActionState>{
                    FontSize: ''+s.fontSize,
                    Image: s.image,
                    TitleAlignment: s.titleAlignment
                })),
                SupportedInMultiActions: a.supportedInMultiActions,
                Tooltip: a.tooltip,
                UUID: a.uuid
            })),
            Author: this.author,
            Category: this.category,
            CategoryIcon: this.categoryIcon,
            CodePath: this.codePath,
            CodePathMac: this.codePathMac,
            CodePathWin: this.codePathWin,
            Description: this.description,
            Icon: this.icon,
            Name: this.name,
            Profiles: this.profiles?.map(p => ({
                Name: p.name,
                DeviceType: p.deviceType,
                DontAutoSwitchWhenInstalled: p.dontAutoSwitchWhenInstalled,
                ReadOnly: p.readOnly
            })),
            PropertyInspectorPath: this.propertyInspectorPath,
            DefaultWindowSize: this.defaultWindowSize,
            URL: this.url,
            Version: this.version,
            SDKVersion: this.sdkVersion,
            OS: this.os.map(os => (<manifest.OSConstraint>{
                Platform: os.platform,
                MinimumVersion: os.minimumVersion
            })),
            Software: { MinimumVersion: this.software?.minimumVersion },
            ApplicationsToMonitor: this.applicationsToMonitor,
        }
    }

    /**
     * The UUID of this plugin
     */
    uuid: string;

    private socket: WebSocket;
    private _registerEvent: string;
    private _info: StreamDeckInfo;
    get info() { return this._info; }

    private connect(port: number, uuid: string, registerEvent: string, info: string) {
        this.uuid = uuid;
        this._registerEvent = registerEvent;
        this._info = JSON.parse(info) as StreamDeckInfo;
        this.socket = new WebSocket(`ws://localhost:${port}`);
        this.socket.addEventListener('open', () => this.register());
        this.socket.addEventListener('message', ev => this.onEvent(JSON.parse(ev.data)));
    }

    openUrl(url: string) {
        this.sendMessage({
            event: 'openUrl',
            payload: { url }
        });
    }

    logMessage(message: string) {
        this.sendMessage({
            event: 'logMessage',
            payload: { message }
        });
    }

    protected applicationDidLaunch(data: ApplicationEvent) {}
    protected applicationDidTerminate(data: ApplicationEvent) {}
    protected systemDidWakeUp(data: Event) {}
    protected deviceDidConnect(data: DeviceEvent) {}
    protected deviceDidDisconnect(data: DeviceEvent) {}
    protected sendToPlugin() {}

    private actionInstances = new Map<string,Action>();
    private _globalSettingsReceivers: Function[] = [];
    getGlobalSettings(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sendMessage({
                event: 'getGlobalSettings',
                context: this.uuid
            });
            this._globalSettingsReceivers.push(resolve);
        });
    }

    setGlobalSettings(settings: any) {
        this.sendMessage({
            event: 'setGlobalSettings',
            context: this.uuid,
            payload: settings
        })
    }

    switchToProfile(device: string, profile: string) {
        this.sendMessage({
            event: 'switchToProfile',
            context: this.uuid,
            device,
            payload: { profile }
        });
    }

    protected onEvent(data: Event) {
        if (data.event === 'didReceiveGlobalSettings') {
            this._globalSettingsReceivers.shift()(data['payload'].settings);
            return;
        }

        let allowedEvents = [
            'applicationDidLaunch',
            'applicationDidTerminate',
            'systemDidWakeUp',
            'deviceDidConnect',
            'deviceDidDisconnect',
            'sendPlugin'
        ];

        if (allowedEvents.includes(data.event))
            return this[data.event](data);
        
        return this.onActionEvent(data as ActionEvent);
    }

    protected onActionEvent(data: ActionEvent) {
        if (!this.actionInstances.has(data.context)) {
            let action = this.actionSpecs.find(x => x.uuid === data.action);
            if (!action)
                throw new Error(`No such action '${data.action}' is defined in this plugin!`);
            this.actionInstances.set(data.context, new action.class(this, data.context));
        }

        let action = this.actionInstances.get(data.context);
        action.receiveEvent(data);
        if (data.event === 'willDisappear')
            this.actionInstances.delete(data.context);
    }

    sendMessage<T = any>(message : T) {
        this.socket.send(JSON.stringify(message));
    }

    private register() {
        this.sendMessage({
            event: this._registerEvent,
            uuid: this.uuid
        });
    }

    static register(options? : { propertyInspector?: typeof PropertyInspector }) {
        let plugin = new this();
        let actionSpecs: ActionSpec[] = [];
    
        for (let actionClass of plugin.actions) {
            let action = new actionClass();
            actionSpecs.push({
                class: actionClass,
                icon: action.icon,
                name: action.name,
                states: action.states,
                tooltip: action.tooltip,
                uuid: action.uuid,
                supportedInMultiActions: action.supportedInMultiActions ?? false
            });
        }

        plugin._actionSpecs = actionSpecs;

        globalThis.StreamDeckPlugin = this;
        globalThis.StreamDeckPlugin.manifest = plugin.manifest;
        globalThis.StreamDeckPlugin.propertyInspector = options?.propertyInspector;
    }

    static propertyInspector: typeof PropertyInspector;
    static runPropertyInspector() { this.propertyInspector?.run(); }

    static run<T extends Plugin>(this: Constructor<T>): T {
        let plugin = new this();
        let actionSpecs: ActionSpec[] = [];
        
        globalThis.STREAMDECK_PLUGIN = plugin;

        for (let actionClass of plugin.actions) {
            let action = new actionClass();
            actionSpecs.push({
                class: actionClass,
                icon: action.icon,
                name: action.name,
                states: action.states,
                tooltip: action.tooltip,
                uuid: action.uuid,
                supportedInMultiActions: action.supportedInMultiActions ?? false
            });
        }

        plugin._actionSpecs = actionSpecs;
        globalThis.connectElgatoStreamDeckSocket = (...args) => (plugin.connect as any)(...args);

        return plugin;
    }
}

export interface ActionEventData {
    settings: any;
    coordinates: { column: number, row: number };
    state: number;
    userDesiredState: number;
    isInMultiAction: boolean;
}

export interface ActionTitleParamsEventData {
    coordinates: { column: number, row: number };
    settings: any;
    state: number;
    title: string;
    titleParameters: {
        fontFamily: string;
        fontSize: number;
        fontStyle: string;
        fontUnderline: boolean;
        showTitle: boolean;
        titleAlignment: 'top' | 'middle' | 'bottom';
        titleColor: string;
    }
}

export class Action {
    constructor(plugin: Plugin, readonly context: string) {
        this.plugin = plugin;
    }

    plugin: Plugin;
    icon: string;
    name: string;
    states: ActionState[];
    supportedInMultiActions?: boolean;
    tooltip: string;
    uuid: string;

    setSettings(settings: any) {
        this.plugin.sendMessage({
            event: 'setSettings',
            context: this.context,
            payload: settings
        });
    }

    getSettings(): Promise<{ settings: any, coordinates: { column: number, row: number }, isInMultiAction: boolean}> {
        return new Promise((resolve, reject) => {
            this.plugin.sendMessage({
                event: 'getSettings',
                context: this.context
            });
            this._settingsReceivers.push(resolve);
        });
    }

    setTitle(title: string, target: 'software' | 'hardware' | 'both', state?: number) {
        this.plugin.sendMessage({
            event: 'setTitle',
            context: this.context,
            payload: { title, target, state }
        });
    }

    setImage(image: string, target: 'software' | 'hardware' | 'both', state: number) {
        this.plugin.sendMessage({
            event: 'setImage',
            context: this.context,
            payload: { image, target, state }
        })
    }

    showAlert() {
        this.plugin.sendMessage({
            event: 'showAlert',
            context: this.context
        });
    }

    showOk() {
        this.plugin.sendMessage({
            event: 'showOk',
            context: this.context
        });
    }

    setState(state: number) {
        this.plugin.sendMessage({
            event: 'setState',
            context: this.context,
            payload: { state }
        });
    }

    sendToPropertyInspector(payload: any) {
        this.plugin.sendMessage({
            event: 'sendToPropertyInspector',
            action: this.uuid,
            context: this.context,
            payload
        });
    }

    protected keyDown(data: ActionEventData, event: ActionEvent) {}
    protected keyUp(data: ActionEventData, event: ActionEvent) {}
    protected willAppear(data: ActionEventData, event: ActionEvent) {}
    protected willDisappear(data: ActionEventData, event: ActionEvent) {}
    protected titleParametersDidChange(data: ActionTitleParamsEventData, event: ActionEvent) {}
    protected propertyInspectorDidAppear(data: never, event: ActionEvent) {}
    protected propertyInspectorDidDisappear(data: never, event: ActionEvent) {}

    protected receiveFromInspector(data: unknown) {}

    /**
     * @internal
     */
    receiveEvent(event: ActionEvent) {
        this.onEvent(event);
    }

    private _settingsReceivers: Function[] = [];

    protected onEvent(event: ActionEvent) {
        if (event.event === 'didReceiveSettings') {
            this._settingsReceivers.shift()(event.payload);
            return;
        }

        let allowedEvents = [
            'keyDown',
            'keyUp',
            'willAppear',
            'willDisappear',
            'titleParametersDidChange',
            'propertyInspectorDidAppear',
            'propertyInspectorDidDisappear'
        ];

        if (allowedEvents.includes(event.event))
            return this[event.event](event.payload, event);
        
        if (event.event === 'sendToPlugin')
            return this.receiveFromInspector(event['payload']);
    }
}

export interface StreamDeckInfo {
    application: {
        font: string;
        language: string;
        platform: string;
        platformVersion: string;
        version: string;
    };

    plugin: {
        uuid: string;
        version: string;
    };

    devicePixelRatio: number;
    colors: {
        buttonPressedBackgroundColor: string,
        buttonPressedBorderColor: string,
        buttonPressedTextColor: string,
        disabledColor: string,
        highlightColor: string,
        mouseDownColor: string
    };

    devices: StreamDeckDevice[];
}

export interface StreamDeckDevice {
    id: string;
    name: string;
    size: {
        columns: number,
        rows: number
    };
    type: number;
}


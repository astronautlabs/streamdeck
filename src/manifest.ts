
export interface Action {
    Icon: string;
    Name: string;
    PropertyInspectorPath?: string;
    States: ActionState[];
    SupportedInMultiActions?: boolean;
    Tooltip?: string;
    UUID: string;
    VisibleInActionsList?: boolean;
}

export interface ActionState {
    Image: string;
    MultiActionImage?: string;
    Name?: string;
    Title?: string;
    ShowTitle?: boolean;
    TitleColor?: string;
    TitleAlignment: 'top' | 'middle' | 'bottom';
    FontFamily?: string;
    FontStyle?: string;
    FontSize?: string;
    FontUnderline?: boolean;
}

export interface Manifest {
    Actions: Action[];
    Author: string;
    Category?: string;
    CategoryIcon?: string;
    CodePath: string;
    CodePathMac?: string;
    CodePathWin?: string;
    Description: string;
    Icon: string;
    Name: string;
    Profiles?: StaticProfile[];
    PropertyInspectorPath?: string;
    DefaultWindowSize?: [width: number, height: number]; // TODO: verify order
    URL?: string;
    Version: string;
    SDKVersion: number;
    OS: OSConstraint[];
    Software: { MinimumVersion: string; }
    ApplicationsToMonitor: Record<'windows' | 'mac' | 'linux', string[]>;
}

export interface StaticProfile {
    Name: string;
    DeviceType: string;
    ReadOnly?: boolean;
    DontAutoSwitchWhenInstalled?: boolean;
}

export interface OSConstraint {
    Platform: 'mac' | 'windows' | 'linux';
    MinimumVersion: string;
}
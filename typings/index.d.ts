declare interface Options {
    output: string;
    outputDirectory: string;
    resolve: string;
    cache?: boolean;
}

type ModulePath = string;
type SourceCode = string;
type ModuleName = string;
// 导入依赖时的字符串，如 "./increment"
type ImportModulePath = string;
type ContextPath = string;
type ChunkName = string;
// 模块说明
interface Reason {
    // 'main' | 'require' | 'context';
    type: string;
    async?: any;
    filename?: string;
    count?: number;
    request?: ModulePath;
}
interface Module {
    id: number;
    request?: ModulePath;
    reasons: Array<Reason>;
    loaders?: Array<string>;
    dependencies?: Array<string>;
    requires?: Array<Require>;
    asyncs?: Array<Module>;
    // todo: 待确定
    contexts?: Array<Require>;
    source?: SourceCode;
    // 模块名，比如 main
    name?: ModuleName;
    chunkId?: number;
    chunks?: Array<string>;
    // 模块被使用次数
    usages?: number;
    realId?: number;
    warnings?: Array<string>;
    errors?: Array<string>;
    requireMap?: Object;
    dirname?: string;
    filename?: string;
    size?: number;
}
interface Modules {
    [key: string]: Module;
}
interface DependencyInfo {
    cacheable: boolean;
    files: Array<string>;
}
interface ModulesById {
    [key: number]: Module;
}
interface Chunk {
    id: String;
    parents?: any;
    modules: Array<string>;
    contexts: Array<string>;
    usages: number;
    realId: number;
    empty?: boolean;
    equals?: string;
}
interface Chunks {
    (key: ChunkName): Chunk;
}
interface DepTree {
    // 警告提示
    warnings: Array<string>;
    // 错误提示
    errors: Array<string>;
    // 所有的模块，以文件路径作为 key，值为 Module interface
    modules: Modules | ModulesById;
    // 所有的模块，以 id 作为 key，值为 Module interface
    modulesById?: ModulesById;
    // 所有 chunk，一个 chunk 表示一个入口
    chunks: Chunks | {};
    chunkCount: number;
    nextModuleId: number;
    nextChunkId: number;
    chunkModules: Object;
    // 最后面会将 modules 赋给该变量，并将 modulesById 赋给 modules
    modulesByFile?: Modules | ModulesById;
}
interface Resource {
    path: string;
    query?: string;
    module: boolean;
}
interface RequestObj {
    loaders?: Array<string>;
    resource: Resource;
}
interface Require {
    id?: number;
    name: ImportModulePath;
    idOnly: boolean;
    // 表达式范围，有两个值，
    expressionRange: [number, number];
    valueRange?: [number, number];
    deleteRange?: [number, number];
    amdNameRange?: [number, number];
    calleeRange?: [number, number];
    variable?: string;
    line: number;
    column: number;
    inTry?: boolean;
    brackets?: boolean;
    append?: boolean;
    requireFunction?: Function;
    moduleExports?: boolean;
    require?: boolean;
    replace?: boolean;
}
interface LoaderContext {
    loaders: Array<string>;
    preLoaders: Array<string>;
    postLoaders: Array<string>;
    loaderType?: 'preLoader' | 'loader' | 'postLoader';
    web: boolean,
    emitWarning: Function;
    emitError: Function;
    resourceQuery?: string;
}
interface extraResults  {
    dependencyInfo: DependencyInfo;
    warnings: string[];
    errors: string[];
}
interface Deps {
    asyncs: Array<Module>;
    requires: Array<Require>;
    contexts: Array<Require>;
}

interface Context {
    context: string;
    module: string;
}

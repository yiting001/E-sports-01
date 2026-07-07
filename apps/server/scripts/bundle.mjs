/**
 * 后端单文件打包脚本。
 *
 * 将 `nest build` 产物（dist/main.js，已含装饰器元数据）经 esbuild 内联全部
 * 依赖，输出 bundle/main.js —— 部署时仅需上传该文件 + .env，node 直接运行，
 * 服务器无需安装依赖与编译。
 *
 * OPTIONAL_EXTERNALS 列出的是各依赖库 try/catch 动态加载的可选包
 * （本项目未安装也用不到），标记为 external 让 require 保留在运行时，
 * 避免打包期解析失败。
 */
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

/**
 * 兼容补丁：wechatpay-axios-plugin 的入口在非严格模式下执行
 * `module.exports.default = module.exports;`，而其导出类已有只读的
 * `static get default()`，打包后统一为严格模式会抛 TypeError。
 * 该赋值仅为 ESM 互操作冗余写法，打包时移除即可。
 */
const wechatpayPatch = {
  name: 'patch-wechatpay-default',
  setup(pluginBuild) {
    pluginBuild.onLoad(
      { filter: /wechatpay-axios-plugin[\\/]index\.js$/ },
      async (args) => ({
        contents: (await readFile(args.path, 'utf8')).replace(
          'module.exports.default = module.exports;',
          '',
        ),
        loader: 'js',
      }),
    );
  },
};

const OPTIONAL_EXTERNALS = [
  // NestJS 可选微服务/缓存能力（未使用）
  '@nestjs/microservices',
  '@nestjs/microservices/microservices-module',
  '@nestjs/mongoose',
  '@nestjs/sequelize',
  'cache-manager',
  // ws 可选原生加速
  'bufferutil',
  'utf-8-validate',
  // pg 可选原生驱动
  'pg-native',
  // TypeORM 支持的其他数据库驱动（本项目仅用 pg）
  'mysql',
  'mysql2',
  'sqlite3',
  'better-sqlite3',
  'oracledb',
  'mssql',
  'mongodb',
  'sql.js',
  'redis',
  'pg-query-stream',
  'typeorm-aurora-data-api-driver',
  'react-native-sqlite-storage',
  '@sap/hana-client',
  '@sap/hana-client/extension/Stream',
  '@google-cloud/spanner',
  'hdb-pool',
  'ts-node',
  // urllib（ali-oss 传递依赖）仅在设置了代理环境变量时才 require
  'proxy-agent',
];

await build({
  entryPoints: ['dist/main.js'],
  outfile: 'bundle/main.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  minify: false,
  external: OPTIONAL_EXTERNALS,
  plugins: [wechatpayPatch],
  logLevel: 'info',
});

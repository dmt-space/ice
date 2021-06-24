import * as path from 'path';
import * as fse from 'fs-extra';
import { IPluginAPI } from '@alib/build-scripts';

export default (api: IPluginAPI, { remoteName, compilePackages, runtimeDir, remoteEntry, bootstrap }) => {
  const { getValue, modifyUserConfig, onGetWebpackConfig, context } = api;
  // create bootstrap for mf
  let bootstrapEntry = '';
  const runtimePublicPath = 'remoteRuntime';
  if (!bootstrap) {
    bootstrapEntry = path.join(getValue('TEMP_PATH'), 'bootstrap.ts');
    fse.writeFileSync(bootstrapEntry, 'import(\'../src/app\')', 'utf-8');
  } else {
    bootstrapEntry = path.isAbsolute(bootstrap) ? bootstrap : path.join(context.rootDir, bootstrap);
  }
  modifyUserConfig((modifyConfig) => {
    const remotePlugins = [[require.resolve('./babelPluginRemote'), { libs: compilePackages, remoteName }]];
    return {
      babelPlugins: Array.isArray(modifyConfig.babelPlugins) ? modifyConfig.babelPlugins.concat(remotePlugins) : remotePlugins,
      moduleFederation: {
        name: 'app',
        remoteType: 'window',
        remotes: [remoteName],
        shared: [
          'react',
          'react-dom',
          'react-router',
          'react-router-dom',
        ]
      },
      sourceDir: 'src',
    };
  });
  onGetWebpackConfig((config) => {
    config.plugin('CopyWebpackPlugin').tap(([args]) => {
      // serve remoteRuntime foder
      return [[...args, { from: runtimeDir, to: path.join(args[0].to, runtimePublicPath) }]];
    });

    // modify entry by onGetWebpackConfig while polyfill will take effect with src/app
    // config.entryPoints.clear();
    config.entry('index').values().forEach(entry => {
      // compatible with entry path in win32
      if (entry.split(path.sep).join('/').match(/\/src\/app/)) {
        config.entry('index').delete(entry);
      }
    });
    config.entry('index').add(bootstrapEntry);
    // eslint-disable-next-line global-require
    const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
    config.plugin('AddAssetHtmlPlugin').use(AddAssetHtmlPlugin, [{
      filepath: path.resolve(runtimeDir, remoteEntry),
      publicPath: `/${runtimePublicPath}`,
    }]).after('HtmlWebpackPlugin');
  });
};

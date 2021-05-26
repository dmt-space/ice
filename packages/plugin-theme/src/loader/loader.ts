import webpack from 'webpack';
import { getOptions } from 'loader-utils';
import postcss from 'postCSS';
import { declVarPlugin } from './plugin';
import type { ThemeVarsType } from '../utils/injectThemes';

interface Option {
  themeVars: ThemeVarsType
  type: 'sass' | 'less'
}

/**
 * Less eg:  @color-bg: #fff; -> @color-bg: var(--color-bg, ${default});
 * 
 * Sass eg:  $color-bg: #fff; -> $color-bg: var(--color-bg, ${default});
 */
export default function loader(
  this: webpack.loader.LoaderContext,
  source: string | Buffer
) {
  const { themeVars, type } = getOptions(this) as any as Option;
  return postcss([declVarPlugin(themeVars, type)]).process(source).css;
}

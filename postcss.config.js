import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

/** @type {import('postcss').ProcessOptions['plugins']} */
export const plugins = [
  autoprefixer(),
  cssnano({
    preset: ['default', { discardComments: { removeAll: true } }],
  }),
];

export default { plugins };

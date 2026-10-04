/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found at
 * https://github.com/react/react-native-website/blob/main/LICENSE
 *
 * Source: https://github.com/react/react-native-website/blob/main/website/core/PrismThemeDark.ts
 */

import type {PrismTheme} from 'prism-react-renderer';

const theme: PrismTheme = {
  plain: {
    color: '#ffffff',
    backgroundColor: '#282c34',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: '#757575',
      },
    },
    {
      types: ['punctuation'],
      style: {
        color: '#ffffff',
      },
    },
    {
      types: ['namespace'],
      style: {
        opacity: 0.7,
      },
    },
    {
      types: ['keyword', 'attr-name'],
      style: {
        color: '#77b7d7',
      },
    },
    {
      types: ['tag', 'operator'],
      style: {
        color: '#dfab5c',
      },
    },
    {
      types: ['function', 'class-name'],
      style: {
        color: '#86d9ca',
      },
    },
    {
      types: ['property', 'selector', 'char', 'builtin', 'url', 'entity'],
      style: {
        color: '#77b7d7',
      },
    },
    {
      types: ['number', 'constant', 'symbol', 'boolean'],
      style: {
        color: '#c64640',
      },
    },
    {
      types: ['string', 'regex', 'attr-value'],
      style: {
        color: '#977cdc',
      },
    },
    {
      types: ['atrule', 'inserted'],
      style: {
        color: '#86d9ca',
      },
    },
    {
      types: ['important', 'variable', 'deleted'],
      style: {
        color: '#c64640',
      },
    },
    {
      types: ['important', 'bold'],
      style: {
        fontWeight: 'bold',
      },
    },
    {
      types: ['italic'],
      style: {
        fontStyle: 'italic',
      },
    },
    {
      types: ['entity'],
      style: {
        cursor: 'help',
      },
    },
  ],
};

export default theme;

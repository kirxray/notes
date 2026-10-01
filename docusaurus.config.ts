import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const [owner = "localhost", repo = ""] = (
	process.env.GITHUB_REPOSITORY ?? ""
).split("/");
const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;

const config: Config = {
	title: "Конспект",
	tagline: "Переводы официальной документации на русский язык",
	favicon: "img/favicon.ico",

	future: {
		v4: true,
	},

	url: repo ? `https://${owner}.github.io` : "http://localhost:7007",
	baseUrl: repo && !isUserSite ? `/${repo}/` : "/",
	organizationName: owner,
	projectName: repo,
	trailingSlash: false,

	onBrokenLinks: "throw",

	i18n: {
		defaultLocale: "ru",
		locales: ["ru"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					routeBasePath: "/",
					sidebarPath: "./sidebars.ts",
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themes: [
		[
			"@easyops-cn/docusaurus-search-local",
			{
				hashed: true,
				language: ["ru", "en"],
				// Документация смонтирована в корень (routeBasePath: "/").
				docsRouteBasePath: "/",
				indexBlog: false,
				// Английские стоп-слова (in, of, ...) в техническом тексте бывают значимыми.
				removeDefaultStopWordFilter: ["en"],
				highlightSearchTermsOnTargetPage: true,
				explicitSearchResultPath: true,
			},
		],
	],

	themeConfig: {
		colorMode: {
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: "Конспект",
			logo: {
				alt: "Логотип",
				src: "img/logo.svg",
			},
			items: [
				{
					type: "docSidebar",
					sidebarId: "docsSidebar",
					position: "left",
					label: "Документация",
				},
			],
		},
		footer: {
			style: "dark",
			copyright: `© ${new Date().getFullYear()} Конспект. Сделано на Docusaurus.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;

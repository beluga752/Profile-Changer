/*
 * ProfileChanger - Client-side profile customization for Vencord
 * Ported from CustomProfile (https://github.com/forevershy/vc-custom-profile, GPL-3.0-or-later)
 * and stripped of all network / profile-sharing code. Everything stays on this machine.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Menu, UserStore } from "@webpack/common";

import { resolveCustomProfileDecorationURL } from "./decorations";
import { getCustomBannerUrl, getCustomProfilePictureUrl } from "./profileAppearance";
import { openEditor, settings } from "./settings";
import {
    applyProfileChanges,
    clearBadges,
    getAvatarDecorationForUser as resolveAvatarDecorationForUser,
    getCustomDisplayNameForUser,
    getNativeBadgesOverride,
    installAvatarDecorationUrlHook,
    installCreationDateOverride,
    patchUser,
    patchUserProfile,
    pickAvatarDecoration,
    registerBadgeProvider,
    uninstallAvatarDecorationUrlHook,
    uninstallCreationDateOverride,
} from "./utils";

/** Discord's own titlebar icon button, the one the Inbox / Help buttons use */
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

const PencilIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
);

function PencilButton() {
    return (
        <HeaderBarIcon
            className="vc-pc-titlebar-btn"
            aria-label="Custom Profile"
            tooltip="Custom Profile"
            onClick={openEditor}
            icon={() => <PencilIcon />}
        />
    );
}

const SelfContextMenu: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user || user.id !== UserStore.getCurrentUser()?.id) return;

    children.push(
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="vc-custom-profile-open"
                label="Custom Profile"
                action={openEditor}
            />
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "ProfileChanger",
    description: "Adds a pencil button to the titlebar that opens a local Custom Profile editor (username, avatar, banner, bio, badges, decorations).",
    tags: ["Customisation", "Fun"],
    authors: [{ name: "Local1host", id: 0n }],
    dependencies: ["BadgeAPI"],

    settings,

    toolboxActions: {
        "Open Custom Profile": openEditor,
    },

    contextMenus: {
        "user-context": SelfContextMenu,
    },

    patches: [
        // Pencil button in the titlebar, immediately left of the Inbox button.
        // Inserting a children entry leaves VencordToolbox's own Fragment patch intact.
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?=\i&&\(\d+,\i\.jsx\)\(\i,\{\.\.\."RECENTS"===)/,
                replace: "$self.renderPencilButton(),",
            },
        },
        {
            find: ".getCurrentUser()",
            replacement: {
                match: /getUser\((\i)\)\{([\s\S]+?)return (\i);/,
                replace: "getUser($1){$2return $self.patchUserResult($3);",
            },
        },
        {
            find: ".getCurrentUser()",
            replacement: {
                match: /getCurrentUser\(\)\{([\s\S]+?)return (\i);/,
                replace: "getCurrentUser(){$1return $self.patchUserResult($2);",
            },
        },
        {
            find: ".useName(",
            replacement: {
                match: /(?<=function \i\(\i\)\{)(?=let)/,
                replace: "const _vcCpName=$self.getDisplayNameOverride(arguments[0]);if(_vcCpName!=null)return _vcCpName;",
            },
        },
        {
            find: ".getGlobalName(",
            replacement: {
                match: /getGlobalName\((\i)\)\{/,
                replace: "getGlobalName($1){const _vcCp=$self.getDisplayNameOverride($1);if(_vcCp!=null)return _vcCp;",
            },
        },
        {
            find: "UserProfileStore",
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )(.+?)(?=})/,
                replace: "$self.profilePatchHook($1)",
            },
        },
        {
            find: "getLegacyUsername(){",
            replacement: {
                match: /getBadges\(\)\{/,
                replace: "getBadges(){const _vcCpOnly=$self.getBadgesOverride(this);if(_vcCpOnly!=null)return _vcCpOnly;",
            },
        },
        {
            find: "getAvatarDecorationURL:",
            replacement: {
                match: /(?<=function \i\(\i\){)(?=let{avatarDecoration)/,
                replace: "const _vcCpDecoUrl=$self.getCustomProfileDecorationURL(arguments[0]);if(_vcCpDecoUrl!=null&&_vcCpDecoUrl!=='')return _vcCpDecoUrl;",
            },
        },
        {
            find: "getAvatarDecorationURL(",
            all: true,
            replacement: {
                match: /getAvatarDecorationURL\((\i)\)\{/,
                replace: "getAvatarDecorationURL($1){const _vcCpDecoUrl=$self.getCustomProfileDecorationURL($1);if(_vcCpDecoUrl!=null&&_vcCpDecoUrl!=='')return _vcCpDecoUrl;",
            },
        },
        {
            find: "isAvatarDecorationAnimating:",
            group: true,
            replacement: [
                {
                    match: /(?<=\.avatarDecoration,guildId:\i\}\)\),)(?<=user:(\i).+?)/,
                    replace: "vcCustomProfileDecoration=$self.getAvatarDecorationHook($1),",
                },
                {
                    match: /(?<={avatarDecoration:).{1,20}?(?=,)(?<=avatarDecorationOverride:(\i).+?)/,
                    replace: "$1??vcCustomProfileDecoration??($&)",
                },
                {
                    match: /(?<=size:\i}\),\[)/,
                    replace: "vcCustomProfileDecoration,",
                },
            ],
        },
        {
            find: ".DISPLAY_NAME_STYLES_COACHMARK)",
            replacement: {
                match: /(?<=\i\)\({avatarDecoration:)\i(?=,)(?<=currentUser:(\i).+?)/,
                replace: "$self.getAvatarDecorationHook($1)??$&",
            },
        },
        ...[
            "#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}",
            "#{intl::COLLECTIBLES_NAMEPLATE_PREVIEW_A11Y}",
            "#{intl::COLLECTIBLES_PROFILE_PREVIEW_A11Y}",
        ].map(find => ({
            find,
            replacement: {
                match: /(?<=userValue:)((\i(?:\.author)?)\?\.avatarDecoration)/,
                replace: "$self.getAvatarDecorationHook($2)??$1",
            },
        })),
        {
            find: "#{intl::PREMIUM_UPSELL_PROFILE_AVATAR_DECO_INLINE_UPSELL_DESCRIPTION}",
            replacement: {
                match: /(?<=\i\)\({user:(\i),guildId:\i,avatarDecoration:)(\i)/,
                replace: "$self.getAvatarDecorationHook($1)??$2",
            },
        },
        {
            find: ':"SHOULD_LOAD");',
            replacement: {
                match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
                replace: "$self.patchBannerUrl(arguments[0])||$&",
            },
        },
        {
            find: "getUserAvatarURL(",
            all: true,
            replacement: {
                match: /getUserAvatarURL\((\i)(?:,(\i))?(?:,(\i))?(?:,(\i))?\)\{/,
                replace: "getUserAvatarURL($1,$2,$3,$4){const _vcCpAvatar=$self.getCustomAvatarURL($1);if(_vcCpAvatar)return _vcCpAvatar;",
            },
        },
        {
            find: ".MODAL_V2,onClose:",
            replacement: {
                match: /(?<=\i\)\({user:(\i),guildId:\i,avatarDecoration:)(\i)/,
                replace: "$self.getAvatarDecorationHook($1)??$2",
            },
        },
        {
            find: '"UserProfilePopout");',
            replacement: {
                match: /(?<=\i\)\({user:(\i),guildId:\i,avatarDecoration:)(\i)/,
                replace: "$self.getAvatarDecorationHook($1)??$2",
            },
        },
    ],

    flux: {
        CONNECTION_OPEN() {
            void applyProfileChanges();
        },
    },

    start() {
        registerBadgeProvider();
        installCreationDateOverride();
        installAvatarDecorationUrlHook();
        void applyProfileChanges();
    },

    stop() {
        clearBadges();
        uninstallCreationDateOverride();
        uninstallAvatarDecorationUrlHook();
    },

    renderPencilButton() {
        return (
            <ErrorBoundary key="vc-profile-changer-btn" noop>
                <PencilButton />
            </ErrorBoundary>
        );
    },

    patchUserResult<T extends { id?: string; } | null | undefined>(user: T): T {
        return patchUser(user as Parameters<typeof patchUser>[0]) as T;
    },

    getAvatarDecorationHook(user: { id?: string; }) {
        return resolveAvatarDecorationForUser(user?.id);
    },

    pickAvatarDecoration,

    getCustomProfileDecorationURL(data: Parameters<typeof resolveCustomProfileDecorationURL>[0]) {
        return resolveCustomProfileDecorationURL(data);
    },

    getCustomAvatarURL(user: { id?: string; }) {
        if (!user?.id) return null;
        return getCustomProfilePictureUrl(user.id);
    },

    patchBannerUrl({ displayProfile }: { displayProfile?: { userId?: string; }; }) {
        return getCustomBannerUrl(displayProfile?.userId) ?? undefined;
    },

    getDisplayNameOverride(user: { id?: string; }) {
        if (!user?.id) return null;
        return getCustomDisplayNameForUser(user.id) || null;
    },

    profilePatchHook(profile: Parameters<typeof patchUserProfile>[0]) {
        return patchUserProfile(profile);
    },

    getBadgesOverride(profile: { userId?: string; }) {
        return getNativeBadgesOverride(profile);
    },
});

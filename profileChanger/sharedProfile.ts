/*
 * ProfileChanger - local-only profile data model
 * Adapted from CustomProfile (GPL-3.0-or-later). No network access: everything stays on this machine.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CustomBadgeDefinition } from "./customBadges";
import { getProfile } from "./settings";

export interface EffectiveProfile {
    customUsername: string;
    customDisplayName: string;
    selectedBadges: string[];
    selectedSpecialBadges: string[];
    customBadges: CustomBadgeDefinition[];
    replaceRealBadges: boolean;
}

export function profileHasContent(profile: EffectiveProfile): boolean {
    return Boolean(
        profile.customUsername.trim()
        || profile.customDisplayName.trim()
        || profile.selectedBadges.length
        || profile.selectedSpecialBadges.length
        || profile.customBadges.some(b => b.enabled)
        || profile.replaceRealBadges
    );
}

export function toEffectiveFromLocal(): EffectiveProfile {
    const p = getProfile();
    return {
        customUsername: p.customUsername,
        customDisplayName: p.customDisplayName,
        selectedBadges: p.selectedBadges,
        selectedSpecialBadges: p.selectedSpecialBadges,
        customBadges: p.customBadges,
        replaceRealBadges: p.replaceRealBadges,
    };
}

/** This plugin is local-only, so profiles of other users are never resolved. */
export function getRemoteEffectiveProfile(_userId: string): EffectiveProfile | null {
    return null;
}

export function getRegistryBaseUrl(): string {
    return "";
}

export function isSyncEnabled(): boolean {
    return false;
}

export async function ensureRegistryCsp(): Promise<boolean> {
    return false;
}

export async function publishSharedProfile(): Promise<boolean> {
    return false;
}

export async function prefetchSharedProfile(): Promise<void> { }

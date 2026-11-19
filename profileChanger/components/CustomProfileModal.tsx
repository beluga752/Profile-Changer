/*
 * ProfileChanger - Custom Profile editor
 * Layout matches the reference screenshots: one scrolling page, sticky footer, no tabs.
 * Ported from CustomProfile (GPL-3.0-or-later), network/sharing UI removed.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Switch } from "@components/Switch";
import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import { IconUtils, Modal, TextInput, UserStore, useEffect, useRef, useState } from "@webpack/common";
import type { ReactNode } from "react";

import {
    badgeIcon,
    BOOST_TIERS,
    NITRO_TIERS,
    PROFILE_BADGES,
    SPECIAL_BADGES,
    type BoostTier,
    type NitroTier,
} from "../badges";
import { DECORATION_PRESETS, getDecorationPresetPreview } from "../decorations";
import { getProfile, resetProfile, setProfile, type CustomProfileData } from "../settings";
import { applyProfileChanges, toggleBadgeSelection } from "../utils";
import { CustomBadgeEditor } from "./CustomBadgeEditor";

const cl = classNameFactory("vc-custom-profile-");

/* ---------------------------------- icons --------------------------------- */

function PencilIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FolderIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
        </svg>
    );
}

function CrossIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
    );
}

function SaveIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-10H5V5h10v4z" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zM7 6h10v13H7V6zm2 2v9h2V8H9zm4 0v9h2V8h-2z" />
        </svg>
    );
}

/* ---------------------------------- pieces -------------------------------- */

function Label({ children, dim }: { children: ReactNode; dim?: string; }) {
    return (
        <div className={cl("label")}>
            {children}
            {dim && <span className={cl("label-dim")}>{dim}</span>}
        </div>
    );
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

interface MediaFieldProps {
    label: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    circle?: boolean;
}

function MediaField({ label, value, placeholder, onChange, circle }: MediaFieldProps) {
    const fileRef = useRef<HTMLInputElement>(null);

    const onFile = async (file: File | null) => {
        if (!file || !file.type.startsWith("image/")) return;
        try {
            onChange(await readFileAsDataUrl(file));
        } catch {
            // ignore unreadable files
        }
    };

    return (
        <div className={cl("field")}>
            <Label>{label}</Label>
            <div className={cl("media-row")}>
                <div className={cl("input-wrap")}>
                    <TextInput value={value} onChange={onChange} placeholder={placeholder} />
                </div>
                <Button
                    variant="secondary"
                    size="iconOnly"
                    className={cl("media-btn")}
                    onClick={() => fileRef.current?.click()}
                    aria-label={`Upload ${label.toLowerCase()}`}
                >
                    <FolderIcon />
                </Button>
                {value.trim() && (
                    <>
                        <img
                            className={cl(circle ? "media-preview-circle" : "media-preview-banner")}
                            src={value.trim()}
                            alt=""
                            draggable={false}
                        />
                        <button
                            type="button"
                            className={cl("media-clear")}
                            onClick={() => onChange("")}
                            aria-label={`Clear ${label.toLowerCase()}`}
                        >
                            <CrossIcon />
                        </button>
                    </>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={e => {
                        void onFile(e.currentTarget.files?.[0] ?? null);
                        e.currentTarget.value = "";
                    }}
                />
            </div>
        </div>
    );
}

function toHex(color: number) {
    return `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
}

function parseHex(hex: string): number | null {
    const cleaned = hex.replace(/[^0-9a-f]/gi, "");
    return cleaned.length === 6 ? parseInt(cleaned, 16) : null;
}

interface ColorRowProps {
    label: string;
    color: number;
    onColorChange(color: number): void;
    onClear(): void;
}

function ColorRow({ label, color, onColorChange, onClear }: ColorRowProps) {
    const [text, setText] = useState(() => toHex(color));

    useEffect(() => setText(toHex(color)), [color]);

    return (
        <div className={cl("color-row")}>
            <span className={cl("color-label")}>{label}</span>
            <input
                type="color"
                className={cl("color-swatch")}
                value={toHex(color)}
                onChange={e => {
                    const parsed = parseHex(e.currentTarget.value);
                    if (parsed != null) {
                        setText(toHex(parsed));
                        onColorChange(parsed);
                    }
                }}
            />
            <div className={cl("input-wrap")}>
                <TextInput
                    value={text}
                    onChange={(v: string) => {
                        setText(v);
                        const parsed = parseHex(v);
                        if (parsed != null) onColorChange(parsed);
                    }}
                />
            </div>
            <button type="button" className={cl("color-clear")} onClick={onClear} aria-label={`Clear ${label}`}>
                <CrossIcon />
            </button>
        </div>
    );
}

function BadgeChip({ id, selected, onToggle, icon, name, title }: {
    id: string;
    selected: boolean;
    onToggle(): void;
    icon?: string;
    name: string;
    title?: string;
}) {
    return (
        <button
            type="button"
            key={id}
            className={cl("chip", { selected })}
            onClick={onToggle}
            title={title}
        >
            {icon && <img src={icon} alt="" draggable={false} />}
            <span>{name}</span>
        </button>
    );
}

/* ----------------------------------- modal -------------------------------- */

export function CustomProfileModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const [draft, setDraft] = useState<CustomProfileData>(getProfile);

    const update = (partial: Partial<CustomProfileData>) => setDraft(prev => ({ ...prev, ...partial }));

    const user = UserStore.getCurrentUser();
    const chipAvatar = draft.customProfilePicture.trim()
        || (user ? IconUtils.getUserAvatarURL(user, true, 32) : "");

    const save = async () => {
        setProfile({
            customUsername: draft.customUsername.trim(),
            customDisplayName: draft.customDisplayName.trim(),
            selectedBadges: draft.selectedBadges,
            selectedSpecialBadges: draft.selectedSpecialBadges,
            nitroTier: draft.nitroTier,
            boostTier: draft.boostTier,
            avatarDecoration: draft.avatarDecoration.trim(),
            avatarDecorationOverride: draft.avatarDecorationOverride,
            replaceRealBadges: draft.replaceRealBadges,
            customAccountCreationDate: draft.customAccountCreationDate.trim(),
            customProfilePicture: draft.customProfilePicture.trim(),
            simulateNitro: draft.simulateNitro,
            customBanner: draft.customBanner.trim(),
            customBio: draft.customBio.trim(),
            customPronouns: draft.customPronouns.trim(),
            useProfileTheme: draft.useProfileTheme,
            profileThemePrimary: draft.profileThemePrimary,
            profileThemeAccent: draft.profileThemeAccent,
            customBadges: draft.customBadges,
        });
        await applyProfileChanges();
        modalProps.onClose();
    };

    const onReset = async () => {
        resetProfile();
        await applyProfileChanges();
        setDraft(getProfile());
    };

    const clearColors = () => update({
        useProfileTheme: false,
        profileThemePrimary: 0,
        profileThemeAccent: 0,
    });

    const selectDecoration = (asset: string) => update({
        avatarDecoration: asset,
        avatarDecorationOverride: true,
    });

    return (
        <Modal
            {...modalProps}
            size="lg"
            title={
                <div className={cl("title")}>
                    <PencilIcon />
                    <span>Custom Profile</span>
                </div>
            }
        >
            <div className={cl("modal")}>
                <div className={cl("profile-chip")} title="Current custom profile">
                    {chipAvatar && <img src={chipAvatar} alt="" draggable={false} />}
                    <ChevronIcon />
                </div>

                <div className={cl("body")}>
                    <div className={cl("field")}>
                        <Label>Username</Label>
                        <div className={cl("input-wrap")}>
                            <TextInput
                                value={draft.customUsername}
                                onChange={v => update({ customUsername: v })}
                                placeholder="Username"
                            />
                        </div>
                    </div>

                    <div className={cl("field")}>
                        <Label>Display Name</Label>
                        <div className={cl("input-wrap")}>
                            <TextInput
                                value={draft.customDisplayName}
                                onChange={v => update({ customDisplayName: v })}
                                placeholder="Display name"
                            />
                        </div>
                    </div>

                    <MediaField
                        label="Profile Picture"
                        value={draft.customProfilePicture}
                        placeholder="Image URL..."
                        onChange={customProfilePicture => update({ customProfilePicture })}
                        circle
                    />

                    <div className={cl("nitro-card")}>
                        <div>
                            <div className={cl("nitro-title")}>Simulate Nitro</div>
                            <div className={cl("nitro-desc")}>Enables banner and profile color</div>
                        </div>
                        <Switch
                            checked={draft.simulateNitro}
                            onChange={simulateNitro => update({ simulateNitro })}
                        />
                    </div>

                    <MediaField
                        label="Banner"
                        value={draft.customBanner}
                        placeholder="Image URL..."
                        onChange={customBanner => update({ customBanner })}
                    />

                    <div className={cl("field")}>
                        <Label>Bio</Label>
                        <div className={cl("input-wrap")}>
                            <TextInput
                                value={draft.customBio}
                                onChange={customBio => update({ customBio })}
                                placeholder="My description..."
                            />
                        </div>
                    </div>

                    <div className={cl("field")}>
                        <Label>Pronouns</Label>
                        <div className={cl("input-wrap")}>
                            <TextInput
                                value={draft.customPronouns}
                                onChange={customPronouns => update({ customPronouns })}
                                placeholder="he/him"
                            />
                        </div>
                    </div>

                    <div className={cl("field")}>
                        <Label dim="(Nitro — gradient possible)">Profile Color</Label>
                        <div className={cl("color-rows")}>
                            <ColorRow
                                label="Color 1"
                                color={draft.profileThemePrimary}
                                onColorChange={c => update({ profileThemePrimary: c, useProfileTheme: true })}
                                onClear={clearColors}
                            />
                            <ColorRow
                                label="Color 2"
                                color={draft.profileThemeAccent}
                                onColorChange={c => update({ profileThemeAccent: c, useProfileTheme: true })}
                                onClear={clearColors}
                            />
                        </div>
                    </div>

                    <div className={cl("field")}>
                        <Label>Account Creation Date</Label>
                        <input
                            type="date"
                            className={cl("date-input")}
                            value={draft.customAccountCreationDate}
                            onChange={e => update({ customAccountCreationDate: e.currentTarget.value })}
                        />
                    </div>

                    <div className={cl("section")}>
                        <div className={cl("replace-row")}>
                            <span>Replace real badges</span>
                            <Switch
                                checked={draft.replaceRealBadges}
                                onChange={v => update({ replaceRealBadges: v })}
                            />
                        </div>

                        <div className={cl("section-title")}>Badges</div>
                        <div className={cl("chips")}>
                            {PROFILE_BADGES.map(badge => (
                                <BadgeChip
                                    key={badge.id}
                                    id={badge.id}
                                    icon={badgeIcon(badge.iconHash)}
                                    name={badge.name}
                                    title={badge.description}
                                    selected={draft.selectedBadges.includes(badge.id)}
                                    onToggle={() => update({
                                        selectedBadges: toggleBadgeSelection(draft.selectedBadges, badge.id, badge.exclusiveGroup),
                                    })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={cl("section")}>
                        <div className={cl("section-title")}>Evolving Nitro Badge</div>
                        <div className={cl("chips")}>
                            {NITRO_TIERS.map(tier => (
                                <BadgeChip
                                    key={tier.id}
                                    id={tier.id}
                                    icon={tier.iconHash ? badgeIcon(tier.iconHash) : undefined}
                                    name={tier.name}
                                    title={tier.description}
                                    selected={draft.nitroTier === tier.id}
                                    onToggle={() => update({ nitroTier: tier.id as NitroTier })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={cl("section")}>
                        <div className={cl("section-title")}>Special Badges</div>
                        <div className={cl("chips")}>
                            {SPECIAL_BADGES.map(badge => (
                                <BadgeChip
                                    key={badge.id}
                                    id={badge.id}
                                    icon={badgeIcon(badge.iconHash)}
                                    name={badge.name}
                                    title={badge.description}
                                    selected={draft.selectedSpecialBadges.includes(badge.id)}
                                    onToggle={() => {
                                        const selected = draft.selectedSpecialBadges.includes(badge.id)
                                            ? draft.selectedSpecialBadges.filter(id => id !== badge.id)
                                            : [...draft.selectedSpecialBadges, badge.id];
                                        update({ selectedSpecialBadges: selected });
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={cl("section")}>
                        <div className={cl("section-title")}>Boost Badge (Server Booster)</div>
                        <div className={cl("chips")}>
                            {BOOST_TIERS.map(tier => (
                                <BadgeChip
                                    key={tier.id}
                                    id={tier.id}
                                    icon={tier.iconHash ? badgeIcon(tier.iconHash) : undefined}
                                    name={tier.name}
                                    selected={draft.boostTier === tier.id}
                                    onToggle={() => update({ boostTier: tier.id as BoostTier })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={cl("section")}>
                        <div className={cl("section-title")}>Avatar Decoration</div>
                        <div className={cl("deco-grid")}>
                            <button
                                type="button"
                                className={cl("deco", { selected: draft.avatarDecorationOverride && !draft.avatarDecoration })}
                                onClick={() => selectDecoration("")}
                            >
                                <span className={cl("deco-none")}>None</span>
                            </button>
                            {DECORATION_PRESETS.filter(p => p.id !== "none").map(preset => (
                                <button
                                    type="button"
                                    key={preset.asset}
                                    className={cl("deco", { selected: draft.avatarDecoration === preset.asset })}
                                    onClick={() => selectDecoration(preset.asset)}
                                    title={`${preset.name}${preset.collection ? ` (${preset.collection})` : ""}`}
                                >
                                    <img src={getDecorationPresetPreview(preset)} alt={preset.name} draggable={false} loading="lazy" />
                                </button>
                            ))}
                        </div>
                        <div className={cl("hint")}>
                            Your Custom Profile is visible only to you — nothing leaves this client.
                        </div>
                    </div>

                    <div className={cl("section")}>
                        <div className={cl("section-title")}>Custom Badges</div>
                        <CustomBadgeEditor
                            badges={draft.customBadges}
                            onChange={customBadges => update({ customBadges })}
                        />
                    </div>
                </div>

                <div className={cl("footer")}>
                    <Button className={cl("btn-save")} onClick={save}>
                        <SaveIcon />
                        Save
                    </Button>
                    <Button variant="dangerPrimary" className={cl("btn-reset")} onClick={onReset}>
                        <TrashIcon />
                        Reset
                    </Button>
                    <Button variant="secondary" className={cl("btn-cancel")} onClick={modalProps.onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

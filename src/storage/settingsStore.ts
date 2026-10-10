import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';

export interface DeviceGroup {
  id: string;
  name: string;
  entityIds: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'user';
  pin: string; // 4-digit PIN code
  allowedGroupIds: string[]; // empty means all if admin, or specific group IDs if user
}

export interface HouseholdSettings {
  deviceGroups: DeviceGroup[];
  customNames: Record<string, string>;
  hiddenEntities: string[];
  users: UserProfile[];
}

const DEFAULT_SETTINGS: HouseholdSettings = {
  users: [
    {
      id: 'user_admin',
      name: 'Admin',
      role: 'admin',
      pin: '1234',
      allowedGroupIds: [],
    },
    {
      id: 'user_kuya',
      name: "Kuya's Tablet",
      role: 'user',
      pin: '',
      allowedGroupIds: ['group_kuyas_room'],
    },
    {
      id: 'user_girls',
      name: "Girls' Tablet",
      role: 'user',
      pin: '',
      allowedGroupIds: ['group_girls_room'],
    },
  ],
  deviceGroups: [
    {
      id: 'group_master_bedroom',
      name: "Master's Bedroom",
      entityIds: [
        'climate.master_s_bedroom_ac_czeozcvgaae_climate',
        'switch.smartplug_p100_ashfan',
      ],
    },
    {
      id: 'group_kuyas_room',
      name: "Kuya's Room",
      entityIds: ['climate.kuya_s_ac_cmskusvgaae_climate'],
    },
    {
      id: 'group_girls_room',
      name: "Girls' Room",
      entityIds: [
        'climate.girls_ac_cmsi9yvgaai_climate',
        'switch.p110_girls_bedroom',
      ],
    },
  ],
  customNames: {},
  hiddenEntities: [],
};

export class SettingsStore {
  private dataDir: string;
  private filePath: string;
  private cache: HouseholdSettings | null = null;

  constructor(dataDir = config.DATA_DIR) {
    this.dataDir = path.resolve(process.cwd(), dataDir);
    this.filePath = path.join(this.dataDir, 'settings.json');
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch {
      // Ignore if exists
    }
  }

  public async getSettings(): Promise<HouseholdSettings> {
    if (this.cache) {
      return this.cache;
    }

    await this.ensureDir();
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.cache = {
        users: Array.isArray(parsed.users) ? parsed.users : DEFAULT_SETTINGS.users,
        deviceGroups: Array.isArray(parsed.deviceGroups) ? parsed.deviceGroups : DEFAULT_SETTINGS.deviceGroups,
        customNames: parsed.customNames && typeof parsed.customNames === 'object' ? parsed.customNames : {},
        hiddenEntities: Array.isArray(parsed.hiddenEntities) ? parsed.hiddenEntities : [],
      };
      return this.cache;
    } catch {
      // File not created yet or corrupt - populate defaults
      this.cache = { ...DEFAULT_SETTINGS };
      await this.saveSettings(this.cache);
      return this.cache;
    }
  }

  public async saveSettings(newSettings: Partial<HouseholdSettings>): Promise<HouseholdSettings> {
    const current = await this.getSettings();

    // When updating users, preserve existing PIN if not explicitly supplied
    let mergedUsers = current.users;
    if (newSettings.users !== undefined) {
      mergedUsers = newSettings.users.map((incoming) => {
        const existing = current.users.find((u) => u.id === incoming.id);
        const pinToUse =
          incoming.pin !== undefined && incoming.pin !== ''
            ? incoming.pin
            : existing?.pin || '';
        return {
          ...incoming,
          pin: pinToUse,
        };
      });
    }

    const merged: HouseholdSettings = {
      users: mergedUsers,
      deviceGroups: newSettings.deviceGroups !== undefined ? newSettings.deviceGroups : current.deviceGroups,
      customNames: newSettings.customNames !== undefined ? newSettings.customNames : current.customNames,
      hiddenEntities: newSettings.hiddenEntities !== undefined ? newSettings.hiddenEntities : current.hiddenEntities,
    };

    await this.ensureDir();
    await fs.writeFile(this.filePath, JSON.stringify(merged, null, 2), 'utf-8');
    this.cache = merged;
    return merged;
  }
}

export const settingsStore = new SettingsStore();

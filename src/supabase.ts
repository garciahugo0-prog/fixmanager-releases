/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://nudkxnfraithxhtutkdw.supabase.co';
export const supabaseAnonKey = 'sb_publishable_HW76IfOUlLj0LdyOUAZeCw_dPG-J9zZ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

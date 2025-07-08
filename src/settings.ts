/******************************************************************************
 *
 * Copyright (c) 2019, the jupyter-fs authors.
 *
 * This file is part of the jupyter-fs library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import type { IFSResource, IFSSettingsResource } from "./filesystem";



/**
 * Ensure undefined string values from settings that are required are translated to empty strings
 * @param settingsResoruce
 * @returns A filled in setting object
 */
export function unpartialResource(settingsResource: IFSSettingsResource): IFSResource {
  return { name: "", url: "", ...settingsResource };
}

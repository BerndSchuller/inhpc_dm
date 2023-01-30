// svg.d.ts

import { LabIcon } from "@jupyterlab/ui-components";

declare module '*.svg' {
    const mountIcSvgString: string;
    export default mountIcSvgString;
}
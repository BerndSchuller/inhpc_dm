import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the server-side extension
 *
 * @param endPoint REST API end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    endPoint
  );

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    if(error instanceof Error)
    {
      throw new ServerConnection.NetworkError(error);
    }
    else
    {
      let err :TypeError
      err = new TypeError("Serverside was not available, something went wrong");
      console.log("Serverside was not available, something went wrong");
      throw new ServerConnection.NetworkError(err);
    }
  }

  if (!response.ok) {
 	let msg: string;
    msg = response.statusText
  	try {
  		msg = msg + JSON.stringify(await response.json());
 	}catch(x){}
  	throw new ServerConnection.ResponseError(response, msg);
  }

  return await response.json();

}// end requestAPI

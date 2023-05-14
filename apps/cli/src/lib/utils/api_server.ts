import { TContextLite } from '../context';

export function setApiServer(server: string, context: TContextLite): string {
  context.userConfig.update((data) => (data.apiServer = server));
  return server;
}

export function getApiServer(context: TContextLite): string | undefined {
  return context.userConfig.data.apiServer;
}

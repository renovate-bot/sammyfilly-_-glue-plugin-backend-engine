//@ts-ignore
import packageJSON from "../package.json";
import { PluginInstance } from "./PluginInstance";
import IApp from "@gluestack/framework/types/app/interface/IApp";
import IPlugin from "@gluestack/framework/types/plugin/interface/IPlugin";
import IInstance from "@gluestack/framework/types/plugin/interface/IInstance";
import ILifeCycle from "@gluestack/framework/types/plugin/interface/ILifeCycle";
import IManagesInstances from "@gluestack/framework/types/plugin/interface/IManagesInstances";
import IGlueStorePlugin from "@gluestack/framework/types/store/interface/IGluePluginStore";
import { writeEnv } from "./helpers/write-env";
import { addMainRouter } from "./helpers/add-main-router";
import { addMainEvents } from "./helpers/add-main-events";
import { addMainCron } from "./helpers/add-main-cron";
import { cronsAdd, cronsList, cronsRemove, eventRemove, eventsAdd, eventsList } from "./commands";
import { serviceAdd } from "./commands/service-add";


// Do not edit the name of this class
export class GlueStackPlugin implements IPlugin, IManagesInstances, ILifeCycle {
  app: IApp;
  instances: IInstance[];
  type: "stateless" | "stateful" | "devonly" = "stateless";
  gluePluginStore: IGlueStorePlugin;

  constructor(app: IApp, gluePluginStore: IGlueStorePlugin) {
    this.app = app;
    this.instances = [];
    this.gluePluginStore = gluePluginStore;
  }

  init() {
    this.app.addCommand((program: any) => eventsAdd(program, this));
    this.app.addCommand((program: any) => eventsList(program, this));
    this.app.addCommand((program: any) => eventRemove(program, this));
    this.app.addCommand((program: any) => cronsAdd(program, this));
    this.app.addCommand((program: any) => cronsList(program, this));
    this.app.addCommand((program: any) => cronsRemove(program, this));
    this.app.addCommand((program: any) => serviceAdd(program, this));
  }

  destroy() {
    //
  }

  getName(): string {
    return packageJSON.name;
  }

  getVersion(): string {
    return packageJSON.version;
  }

  getType(): "stateless" | "stateful" | "devonly" {
    return this.type;
  }

  getTemplateFolderPath(): string {
    return `${process.cwd()}/node_modules/${this.getName()}/template`;
  }

  getInstallationPath(target: string): string {
    return `./backend/${target}`;
  }

  async runPostInstall(instanceName: string, target: string) {
    await this.checkAlreadyInstalled();
    if (instanceName !== "engine") {
      console.log("\x1b[36m");
      console.log(
        `Install engine instance: \`node glue add engine engine\``,
      );
      console.log("\x1b[31m");
      throw new Error(
        "engine supports instance name `engine` only",
      );
    }

    const engineInstance: PluginInstance =
      await this.app.createPluginInstance(
        this,
        instanceName,
        this.getTemplateFolderPath(),
        target,
      );

    if (engineInstance) {
      // Write env file
      await writeEnv(engineInstance);

      // Add main router
      await addMainRouter(engineInstance);

      // Adds events directories
      await addMainEvents(engineInstance);

      // Adds crons directory
      await addMainCron(engineInstance);
    }
  }

  async checkAlreadyInstalled() {
    const enginePlugin: GlueStackPlugin = this.app.getPluginByName(
      "@gluestack/glue-plugin-backend-engine",
    );
    //Validation
    if (enginePlugin?.getInstances()?.[0]) {
      throw new Error(
        `engine instance already installed as ${enginePlugin
          .getInstances()[0]
          .getName()}`,
      );
    }
  }

  createInstance(
    key: string,
    gluePluginStore: IGlueStorePlugin,
    installationPath: string,
  ): IInstance {
    const instance = new PluginInstance(
      this.app,
      this,
      key,
      gluePluginStore,
      installationPath,
    );

    this.instances.push(instance);
    return instance;
  }

  getInstances(): IInstance[] {
    return this.instances;
  }
}
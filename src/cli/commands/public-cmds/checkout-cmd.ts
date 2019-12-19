import chalk from 'chalk';
import Command from '../../command';
import { checkout } from '../../../api/consumer';
import { applyVersionReport } from './merge-cmd';
import { getMergeStrategy } from '../../../consumer/versions-ops/merge-version';
import { CheckoutProps } from '../../../consumer/versions-ops/checkout-version';
import { LATEST, WILDCARD_HELP } from '../../../constants';
import { ApplyVersionResults } from '../../../consumer/versions-ops/merge-version';

export default class Checkout extends Command {
  name = 'checkout [values...]';
  description = `switch between component versions or remove local changes
  bit checkout <version> [ids...] => checkout the specified ids (or all components when --all is used) to the specified version
  bit checkout latest [ids...] => checkout the specified ids (or all components when --all is used) to their latest versions
  bit checkout [ids...] --reset => remove local modifications from the specified ids (or all components when --all is used)
  bit checkout <local-lane> --lane => switch to the specified lane and checkout components to the head of this lane
  bit checkout <remote> <lane> --lane => switch to the specified remote lane and checkout components to the head of this lane
  ${WILDCARD_HELP('checkout 0.0.1')}`;
  alias = 'U';
  // @ts-ignore AUTO-ADDED-AFTER-MIGRATION-PLEASE-FIX!
  opts = [
    [
      'i',
      'interactive-merge',
      'when a component is modified and the merge process found conflicts, display options to resolve them'
    ],
    ['o', 'ours', 'in case of a conflict, override the used version with the current modification'],
    ['t', 'theirs', 'in case of a conflict, override the current modification with the specified version'],
    ['m', 'manual', 'in case of a conflict, leave the files with a conflict state to resolve them manually later'],
    ['r', 'reset', 'remove local changes'],
    ['a', 'all', 'all components'],
    ['', 'lane', 'checkout to a lane'],
    ['v', 'verbose', 'showing verbose output for inspection'],
    ['', 'skip-npm-install', 'do not install packages of the imported components'],
    ['', 'ignore-dist', 'do not write dist files (when exist)']
  ];
  loader = true;

  action(
    [values]: [string[]],
    {
      interactiveMerge = false,
      ours = false,
      theirs = false,
      manual = false,
      reset = false,
      all = false,
      lane = false,
      verbose = false,
      skipNpmInstall = false,
      ignoreDist = false,
      skipLaneComponentsNotInWorkspace = false
    }: {
      interactiveMerge?: boolean;
      ours?: boolean;
      theirs?: boolean;
      manual?: boolean;
      reset?: boolean;
      all?: boolean;
      lane?: boolean;
      verbose?: boolean;
      skipNpmInstall?: boolean;
      ignoreDist?: boolean;
      skipLaneComponentsNotInWorkspace?: boolean;
    }
  ): Promise<ApplyVersionResults> {
    const checkoutProps: CheckoutProps = {
      promptMergeOptions: interactiveMerge,
      mergeStrategy: getMergeStrategy(ours, theirs, manual),
      reset,
      all,
      verbose,
      isLane: lane,
      skipNpmInstall,
      ignoreDist,
      skipLaneComponentsNotInWorkspace
    };
    return checkout(values, checkoutProps);
  }

  report({ components, version, failedComponents }: ApplyVersionResults): string {
    const isLatest = Boolean(version && version === LATEST);
    const isReset = !version;
    const getFailureOutput = () => {
      if (!failedComponents || !failedComponents.length) return '';
      const title = 'the checkout has been canceled on the following component(s)';
      const body = failedComponents
        .map(
          failedComponent =>
            `${chalk.bold(failedComponent.id.toString())} - ${chalk.red(failedComponent.failureMessage)}`
        )
        .join('\n');
      return `${title}\n${body}\n\n`;
    };
    const getSuccessfulOutput = () => {
      if (!components || !components.length) return '';
      if (components.length === 1) {
        const component = components[0];
        const componentName = isReset ? component.id.toString() : component.id.toStringWithoutVersion();
        if (isReset) return `successfully reset ${chalk.bold(componentName)}\n`;
        const title = `successfully switched ${chalk.bold(componentName)} to version ${chalk.bold(
          // $FlowFixMe version is defined when !isReset
          // @ts-ignore AUTO-ADDED-AFTER-MIGRATION-PLEASE-FIX!
          isLatest ? component.id.version : version
        )}\n`;
        return `${title} ${applyVersionReport(components, false)}`;
      }
      if (isReset) {
        const title = 'successfully reset the following components\n\n';
        const body = components.map(component => chalk.bold(component.id.toString())).join('\n');
        return title + body;
      }
      // $FlowFixMe version is defined when !isReset
      // @ts-ignore AUTO-ADDED-AFTER-MIGRATION-PLEASE-FIX!
      const versionOutput = isLatest ? 'their latest version' : `version ${chalk.bold(version)}`;
      const title = `successfully switched the following components to ${versionOutput}\n\n`;
      const showVersion = isLatest || isReset;
      const componentsStr = applyVersionReport(components, true, showVersion);
      return title + componentsStr;
    };
    const failedOutput = getFailureOutput();
    const successOutput = getSuccessfulOutput();
    return failedOutput + successOutput;
  }
}

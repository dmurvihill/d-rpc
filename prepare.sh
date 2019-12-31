#!/bin/bash
npm run clean &&
npm test &&
npm run lint &&
tsc --project tsconfig.prod.json

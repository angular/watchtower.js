#!/bin/bash

set -e

export SAUCE_ACCESS_KEY=`echo $SAUCE_ACCESS_KEY | rev`

gulp build test --browsers SL_Chrome,SL_Safari,SL_Firefox,SL_IE_9,SL_IE_10,SL_IE_11

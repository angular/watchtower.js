#Watchtower.js [![Build Status](https://travis-ci.org/angular/watchtower.js.svg?branch=master)](https://travis-ci.org/angular/watchtower.js)

Super-fast change detection for AngularJS 2.0, based on Miško Hevery's
[draft](https://docs.google.com/document/d/10W46qDNO8Dl0Uye3QX0oUDPYAwaPl0qNy73TVLjd1WI/edit?usp=sharing),
and the implementation in [Angular.dart](https://github.com/angular/angular.dart/blob/master/lib/change_detection/).

The goal is to offer change detection which is extremely performant, supports watching the result of method
invocation and getter/setter functions, and puts 0 pressure on the GC. Algorithms should be written in a
fashion which makes VM optimization possible.

Testing should cover both behaviour as well as performance, as it is extremely important that applications
can handle thousands of watched expressions, with minimal memory and performance cost.

## [License](LICENSE)

Copyright 2014 Google, Inc. http://angularjs.org

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

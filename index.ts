// ==UserScript==
// @name         Refine Upwork job list
// @match        https://www.upwork.com/ab/find-work/*
// @grant        none
// ==/UserScript==

type AnyFn = () => any
type Elt = Element | HTMLElement

(function() {
  'use strict';

  /////////////////////////////////////////////////////////////
  ////                                                     ////
  //// At @match, remove job listings that have an hourly  ////
  //// range specified whose max is below myMinWage        ////
  ////                                                     ////
  /////////////////////////////////////////////////////////////

  const myMinWage = 99999999999999999999999999999999999999999999999999999999999999999999999999999999

  //////////////////////
  //// Define funcs ////
  //////////////////////

  // Like jQuery's .parents()
  const getParents = (element: Elt, selector: string, includeElement = false): Elt[] => {
    const isWithSelector = selector !== undefined;
    const elements = [];
    let elem: Elt | null = element;

    if (!includeElement) {
      elem = elem.parentElement;
    }

    while (elem !== null) {
      if (elem.nodeType === Node.ELEMENT_NODE) {
        if (!isWithSelector || elem.matches(selector)) {
          elements.push(elem);
        }
      }

      elem = elem.parentElement;
    }

    return elements;
  };

  // Select all elements in job listings that contain the text containing hourly range
	const selectEltsContainingHourlyRange = (): NodeListOf<Element> => {
		const selectors = [
		  '.job-tile strong[data-ng-if="::$ctrl.isHourlyRange()"]',
      '.job-tile-responsive strong[data-ng-if="::$ctrl.isHourlyRange()"]',
      '.job-tile strong[data-ng-if="::jsuJobTypeController.isHourlyRange()"]'
		]

		return document.querySelectorAll(selectors.join(', '))
	}

	// Exec function fn in milliseconds ms
	const doIn = (fn: AnyFn, ms: number) => {
		setTimeout(fn, ms)
	}

	// Keep executing the same function fn every second until it returns something
	// Dependencies: doIn()
	const tryUntilTruthy = (fn: AnyFn) => new Promise((resolve) => {
		const resolveIfTruthyOtherwiseTryInABit = () => {
			const aBit = 1000
			const isTruthy = fn()

			if (isTruthy) {
				resolve(isTruthy)
			} else {
				doIn(resolveIfTruthyOtherwiseTryInABit, aBit)
			}
		}

		resolveIfTruthyOtherwiseTryInABit()
	})

	// Return selectEltsContainingHourlyRange() array unless it is empty
	// Dependencies: selectEltsContainingHourlyRange()
	const eltsOrNull = (): NodeListOf<Element> | null => {
		const elts = selectEltsContainingHourlyRange()

		if (elts.length) {
			return elts
		}

		return null
	}

	// Given a string that contains an hourly wage, is the max below myWage?
	const isHourlyBelowMyWage = (str: string, myWage: number) => {
	  const getJobHourlyMaxOrReturnNull = () => {
	    const match = str.match(/-\$(\d+)\./)
	    
	    if (match && match.length) {
	      return parseFloat(match[1])
	    }
	    
	    return null
	  }
	  
	  const jobHourlyMaxOrNull = getJobHourlyMaxOrReturnNull()
	  
	  if (jobHourlyMaxOrNull && jobHourlyMaxOrNull < myWage) {
	    return true
	  }
	  
	  return false
	}

	// Given the element that contains the hourly wage, remove its parent job listing
	// Dependencies: getParents()
	const removeParentJobListing = (elt: Elt) => {
		const parents = getParents(elt, '.job-tile, .job-tile-responsive')

		parents.forEach((parent) => parent.remove())
	}

	// Remove job listings that have an hourly range specified whose max is below myMinWage
	const searchAndDestroyUnworthyListings = () => {
		tryUntilTruthy(eltsOrNull).then(res => {
        // @ts-ignore
        res.forEach((elt) => {
          if (isHourlyBelowMyWage(elt.innerText, myMinWage)) {
            console.log("Listing removed.");
            removeParentJobListing(elt)
          }
        })
		})
	}

	// Do it on page load ...
	searchAndDestroyUnworthyListings()

  // ... and when I click to load more listings
  tryUntilTruthy(() => document.querySelector('#load-more-button-responsive, #load-more-button')).then((res) => {
    if (res instanceof HTMLElement) {
      res.addEventListener('click', () => doIn(searchAndDestroyUnworthyListings, 2000)) // wait 3 seconds for new results to load
    }
  })
})()

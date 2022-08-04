// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Contents } from '@jupyterlab/services';
import { ReactWidget } from '@jupyterlab/apputils';
import { InputGroup } from '@jupyterlab/ui-components';
import { StringExt } from '@lumino/algorithm';
import React, { useEffect, useState } from 'react';
//import { DirListing } from './listing';
import { DirListing } from '@jupyterlab/filebrowser';
//import { dm_DirListing } from './mod_listing';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  listing: DirListing;
  useFuzzyFilter: boolean;
  placeholder?: string;
  forceRefresh?: boolean;
}

/**
 * A text match score with associated content item.
 */
interface IScore {
  /**
   * The numerical score for the text match.
   */
  score: number;

  /**
   * The indices of the text matches.
   */
  indices: number[] | null;
}

/**
 * Perform a fuzzy search on a single item.
 */
function fuzzySearch(source: string, query: string): IScore | null {
  // Set up the match score and indices array.
  let score = Infinity;
  let indices: number[] | null = null;

  // The regex for search word boundaries
  const rgx = /\b\w/g;

  let continueSearch = true;

  // Search the source by word boundary.
  while (continueSearch) {
    // Find the next word boundary in the source.
    let rgxMatch = rgx.exec(source);

    // Break if there is no more source context.
    if (!rgxMatch) {
      break;
    }

    // Run the string match on the relevant substring.
    let match = StringExt.matchSumOfDeltas(source, query, rgxMatch.index);

    // Break if there is no match.
    if (!match) {
      break;
    }

    // Update the match if the score is better.
    if (match && match.score <= score) {
      score = match.score;
      indices = match.indices;
    }
  }

  // Bail if there was no match.
  if (!indices || score === Infinity) {
    return null;
  }

  // Handle a split match.
  return {
    score,
    indices
  };
}

const FilterBox = (props: IFilterBoxProps) => {
  const [filter, setFilter] = useState('');

  if (props.forceRefresh) {
    useEffect(() => {
      props.listing.model.setFilter((item: Contents.IModel) => {
        return true;
      });
    }, []);
  }

  /**
   * Handler for search input changes.
   */
  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    setFilter(target.value);
    props.listing.model.setFilter((item: Contents.IModel) => {
      if (props.useFuzzyFilter) {
        // Run the fuzzy search for the item and query.
        const name = item.name.toLowerCase();
        const query = target.value.toLowerCase();
        let score = fuzzySearch(name, query);
        // Ignore the item if it is not a match.
        if (!score) {
          item.indices = [];
          return false;
        }
        item.indices = score.indices;
        return true;
      }
      const i = item.name.indexOf(target.value);
      if (i === -1) {
        item.indices = [];
        return false;
      }
      item.indices = [...Array(target.value.length).keys()].map(x => x + i);
      return true;
    });
  };

  return (
    <InputGroup
      type="text"
      rightIcon="ui-components:search"
      placeholder={props.placeholder}
      onChange={handleChange}
      value={filter}
    />
  );
};

/**
 * A widget which hosts a input textbox to filter on file names.
 */
export const dm_FilenameSearcher = (props: IFilterBoxProps): ReactWidget => {
  return ReactWidget.create(
    <FilterBox
      listing={props.listing}
      useFuzzyFilter={props.useFuzzyFilter}
      placeholder={props.placeholder}
      forceRefresh={props.forceRefresh}
    />
  );
};
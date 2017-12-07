import React, { Component } from 'react'
import classnames from 'classnames'
import axios from 'axios'
import _ from 'lodash'

import { Grid, Row, Col, Alert } from 'react-bootstrap'

import Sidebar from './Sidebar'
import List from './List'
import CreateModal from './modal'

import ContentWrapper from '~/components/Layout/ContentWrapper'
import PageHeader from '~/components/Layout/PageHeader'

const style = require('./style.scss')

const MESSAGES_PER_PAGE = 20

export default class ContentView extends Component {
  state = {
    loading: true,
    showModal: false,
    modifyId: null,
    selectedId: 'all',
    page: 1
  }

  componentDidMount() {
    this.fetchCategoryMessages(this.state.selectedId)
      .then(this.fetchCategories)
      .then(() => this.fetchSchema(this.state.selectedId))
      .then(() => {
        this.setState({
          loading: false
        })
      })
  }

  fetchCategories = () =>
    axios.get('/content/categories').then(({ data }) => {
      const count =
        this.state.selectedId === 'all'
          ? _.sumBy(data, 'count') || 0
          : _.find(data, { id: this.state.selectedId }).count

      this.setState({
        categories: data,
        count
      })
    })

  fetchCategoryMessages(id) {
    const from = (this.state.page - 1) * MESSAGES_PER_PAGE
    const count = MESSAGES_PER_PAGE

    return axios
      .get(`/content/categories/${id}/items`, {
        params: { from: from, count: count, search: this.state.searchTerm }
      })
      .then(({ data }) => {
        this.setState({
          messages: data
        })
      })
  }

  fetchSchema(id) {
    return axios.get(`/content/categories/${id}/schema`).then(({ data }) => {
      this.setState({
        schema: data
      })
    })
  }

  createOrUpdateItem(data) {
    let url = `/content/categories/${this.state.selectedId}/items`

    if (this.state.modifyId) {
      const categoryId = _.find(this.state.messages, { id: this.state.modifyId }).categoryId
      url = `/content/categories/${categoryId}/items/${this.state.modifyId}`
    }

    return axios.post(url, { formData: data }).then()
  }

  deleteItems(data) {
    return axios.post('/content/categories/all/bulk_delete', data).then()
  }

  handleToggleModal = () => {
    this.setState({
      showModal: !this.state.showModal,
      modifyId: null
    })
  }

  handleCreateOrUpdate = data => {
    this.createOrUpdateItem(data)
      .then(this.fetchCategories)
      .then(() => {
        return this.fetchCategoryMessages(this.state.selectedId)
      })
      .then(() => {
        this.setState({ showModal: false })
      })
  }

  handleCategorySelected = id => {
    this.fetchCategoryMessages(id)
      .then(() => {
        this.setState({ selectedId: id })
      })
      .then(() => {
        this.fetchSchema(id)
      })
  }

  handleDeleteSelected = ids => {
    this.deleteItems(ids)
      .then(this.fetchCategories)
      .then(() => {
        return this.fetchCategoryMessages(this.state.selectedId)
      })
  }

  handleModalShow = (id, categoryId) => {
    const showmodal = () =>
      this.setState({
        modifyId: id,
        showModal: true
      })

    if (!this.state.schema || this.state.selectedId !== categoryId) {
      this.fetchSchema(categoryId).then(showmodal)
    } else {
      showmodal()
    }
  }

  handleRefresh = () => {
    this.fetchCategoryMessages(this.state.selectedId || 'all')
  }

  handlePrevious = () => {
    this.setState({
      page: this.state.page - 1 || 1
    })

    setImmediate(() => {
      this.fetchCategoryMessages(this.state.selectedId)
    })
  }

  handleNext = () => {
    this.setState({
      page: this.state.page + 1
    })

    setImmediate(() => {
      this.fetchCategoryMessages(this.state.selectedId)
    })
  }

  handleSearch = input => {
    this.setState({
      searchTerm: input
    })

    setImmediate(() => {
      this.fetchCategoryMessages(this.state.selectedId)
    })
  }

  renderBody() {
    const { loading, selectedId = 'all', schema, modifyId, categories = [] } = this.state

    const classNames = classnames(style.content, 'bp-content')

    if (!categories.length) {
      return (
        <div className={classNames}>
          <Alert bsStyle="warning">
            <strong>We think you don't have any content types defined.</strong> Please&nbsp;
            <a href="https://botpress.io/docs/foundamentals/content/" target="_blank">
              <strong>read the docs</strong>
            </a>
            &nbsp;to see how you can make use of this feature.
          </Alert>
        </div>
      )
    }

    return (
      <div>
        <Grid className={classNames}>
          <Row>
            <Col xs={3}>
              <Sidebar
                categories={categories}
                selectedId={selectedId}
                handleAdd={this.handleToggleModal}
                handleCategorySelected={this.handleCategorySelected}
              />
            </Col>
            <Col xs={9}>
              <List
                page={this.state.page}
                count={this.state.count}
                messagesPerPage={MESSAGES_PER_PAGE}
                messages={this.state.messages || []}
                searchTerm={this.state.searchTerm}
                handlePrevious={this.handlePrevious}
                handleNext={this.handleNext}
                handleRefresh={this.handleRefresh}
                handleModalShow={this.handleModalShow}
                handleDeleteSelected={this.handleDeleteSelected}
                handleSearch={this.handleSearch}
              />
            </Col>
          </Row>
        </Grid>
        <CreateModal
          show={this.state.showModal}
          schema={(schema && schema.json) || {}}
          uiSchema={(schema && schema.ui) || {}}
          formData={modifyId ? _.find(this.state.messages, { id: modifyId }).formData : null}
          handleCreateOrUpdate={this.handleCreateOrUpdate}
          handleClose={this.handleToggleModal}
        />
      </div>
    )
  }

  render() {
    const { loading } = this.state

    if (loading) {
      return null
    }

    return (
      <ContentWrapper>
        <PageHeader>Content Manager</PageHeader>
        {this.renderBody()}
      </ContentWrapper>
    )
  }
}
